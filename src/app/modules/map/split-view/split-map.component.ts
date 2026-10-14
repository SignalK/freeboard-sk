import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as OlMap } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { getWidth } from 'ol/extent';
import { toLonLat } from 'ol/proj';
import { Subscription } from 'rxjs';
import { AppFacade } from 'src/app/app.facade';
import { SKStreamFacade } from 'src/app/modules';
import {
  FreeboardOpenlayersModule,
  hitToleranceForPointer,
  worldCopyOffset
} from 'src/app/modules/map/ol';
import {
  FBClickEvent,
  FBMapEvent
} from 'src/app/modules/map/ol/lib/map.component';
import { MapReadyEvent } from 'src/app/modules/map/ol/lib/models';
import { Position } from 'src/app/types';
import { FBMapInteractService } from '../fbmap-interact.service';
import { mapControls, mapInteractions } from '../mapconfig';
import { isPanKey } from 'src/app/lib/pan-keys';
import { zoomKeyDirection } from 'src/app/lib/zoom-keys';
import { mirrorLayers } from './layer-mirror';
import {
  ratioFromPointer,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
  viewFootprint
} from './split-view';
import { PaneCommand, SplitPane, SplitViewService } from './split-view.service';

/**
 * The second chart pane of the split view: everything the main chart shows,
 * with a view of its own and the main chart's viewport outlined on it. Its
 * layers mirror the main chart's (see layer-mirror), and its taps are handled
 * by the main chart, so popovers and menus work the same in both panes. It has
 * no buttons of its own: pressing a pane makes it the active one, and the
 * shared map buttons act on the active pane.
 */
@Component({
  selector: 'fb-split-map',
  imports: [FreeboardOpenlayersModule, MatIconModule, MatTooltipModule],
  templateUrl: './split-map.component.html',
  styleUrls: ['./split-map.component.css'],
  host: {
    '[class.active-pane]': 'split.secondaryActive()',
    '[class.stacked]': 'split.stacked()'
  }
})
export class SplitMapComponent implements OnInit, AfterViewInit, OnDestroy {
  protected app = inject(AppFacade);
  protected skstream = inject(SKStreamFacade);
  protected split = inject(SplitViewService);
  private mapInteract = inject(FBMapInteractService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private interactionList: { name: string }[] = [];
  private interactionsFor: boolean | undefined;
  protected readonly olControls = mapControls;

  protected zoom = signal<number>(10);
  protected center = signal<Position>([0, 0]);
  protected heading = signal<number>(0);
  protected rotation = computed(() =>
    this.split.northUp() ? 0 : 0 - this.heading()
  );
  protected footprint = signal<Coordinate[] | null>(null);

  private map: OlMap | undefined;
  private mainMap: OlMap | undefined;
  private stopMirror: (() => void) | undefined;
  private stopUseWatch: (() => void)[] = [];
  private panelSize: ResizeObserver | undefined;
  private gripFrame = 0;
  protected readonly ratioMin = Math.round(SPLIT_RATIO_MIN * 100);
  protected readonly ratioMax = Math.round(SPLIT_RATIO_MAX * 100);
  private vessels: Subscription;
  private commands: Subscription;
  private pressedAt = 0;
  private gripRect: DOMRect | null = null;
  private gripStacked = false;

  constructor() {
    effect(() => {
      if (this.split.follow()) {
        untracked(() => this.centerOnVessel());
      }
    });
  }

  ngOnInit() {
    this.heading.set(this.app.data.vessels.active.orientation ?? 0);

    const { min } = this.app.MAP_ZOOM_EXTENT;
    const last = this.split.lastView();
    this.zoom.set(
      last.zoom ?? Math.max(min, this.app.config.map.zoomLevel - 3)
    );
    if (!this.split.follow() && last.center) {
      this.center.set(last.center);
    } else if (!this.centerOnVessel()) {
      // No fix yet: start where the main chart was left, not at 0,0.
      this.center.set(last.center ?? [...this.app.config.map.center]);
    }

    this.vessels = this.skstream.vessels$().subscribe(() => this.onVessels());
    this.commands = this.split.commands$.subscribe((c) => this.onCommand(c));
  }

  ngAfterViewInit() {
    // The panel's own shape decides whether the panes stack, and its length
    // along the split how far the divider may go.
    const panel = this.host.nativeElement.parentElement;
    if (panel) {
      this.panelSize = new ResizeObserver(() =>
        this.split.setPanelSize(panel.clientWidth, panel.clientHeight)
      );
      this.panelSize.observe(panel);
    }
  }

  ngOnDestroy() {
    this.vessels?.unsubscribe();
    this.commands?.unsubscribe();
    this.panelSize?.disconnect();
    cancelAnimationFrame(this.gripFrame);
    this.stopMirror?.();
    this.stopUseWatch.forEach((stop) => stop());
    this.mainMap?.un('moveend', this.onMainMoved);
    this.mainMap?.un('change:size', this.onMainMoved);
    this.split.setSecondaryMap(null);
  }

  protected onMapReady(e: MapReadyEvent) {
    this.map = e.map;
    // Both maps are registered by now; the main chart is the one that isn't ours.
    this.mainMap = e.mapService.getMaps().find((m) => m !== e.map);
    if (this.mainMap) {
      this.stopMirror = mirrorLayers(this.mainMap, e.map);
      this.mainMap.on('moveend', this.onMainMoved);
      this.mainMap.on('change:size', this.onMainMoved);
      this.stopUseWatch.push(this.activateOnUse(this.mainMap, 'main'));
    }
    this.stopUseWatch.push(this.activateOnUse(e.map, 'secondary'));
    this.updateFootprint();
    this.split.setSecondaryMap(e.map);
  }

  /**
   * A press on a pane's chart, or keyboard focus moving onto it, makes that
   * pane the active one. Its controls and popovers don't count: the zoom
   * buttons sit on the main chart, and pressing them must not take them away
   * from the second pane. Nor does focus the app moves there itself after a
   * toolbar click; only focus the user moved by keyboard (:focus-visible).
   */
  private activateOnUse(map: OlMap, pane: SplitPane): () => void {
    const viewport = map.getViewport();
    const onChart = (e: Event) =>
      !map.getOverlayContainerStopEvent().contains(e.target as Node);
    const onPress = (e: PointerEvent) => {
      if (onChart(e)) {
        this.split.activate(pane);
      }
    };
    const onFocus = (e: FocusEvent) => {
      if (onChart(e) && (e.target as Element).matches?.(':focus-visible')) {
        this.split.activate(pane);
      }
    };
    viewport.addEventListener('pointerdown', onPress);
    map.getTargetElement()?.addEventListener('focusin', onFocus);
    return () => {
      viewport.removeEventListener('pointerdown', onPress);
      map.getTargetElement()?.removeEventListener('focusin', onFocus);
    };
  }

  // ---------- taps ----------

  /** Drawing, measuring and editing happen on the main chart only. */
  private interacting(): boolean {
    return (
      this.mapInteract.isDrawing() ||
      this.mapInteract.isModifying() ||
      this.mapInteract.isMeasuring() ||
      this.mapInteract.isBoxSelecting()
    );
  }

  protected onPress() {
    this.pressedAt = Date.now();
  }

  protected onTap(e: FBClickEvent) {
    if (this.map && !this.interacting()) {
      this.split.forwardTap({
        kind: 'click',
        event: e,
        map: this.map,
        pressedAt: this.pressedAt
      });
    }
  }

  /** Right click, or a long press on a touch screen: the chart menu. */
  protected onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const map = this.map;
    if (!map || this.interacting()) {
      return;
    }
    const coordinate = map.getEventCoordinate(e);
    const worldWidth = getWidth(map.getView().getProjection().getExtent());
    this.split.forwardTap({
      kind: 'contextmenu',
      event: e,
      features: map.getFeaturesAtPixel(map.getEventPixel(e), {
        hitTolerance: hitToleranceForPointer(
          (e as PointerEvent).pointerType,
          5,
          15
        )
      }),
      lonlat: toLonLat(coordinate),
      worldOffset: worldCopyOffset(coordinate[0], worldWidth),
      map
    });
  }

  protected onMoveEnd(e: FBMapEvent) {
    this.zoom.set(e.zoom);
    this.split.rememberView(e.zoom, [e.lonlat[0], e.lonlat[1]]);
  }

  protected onDrag() {
    if (this.split.follow()) {
      this.split.setFollow(false);
    }
  }

  /**
   * The main chart's interactions, double-click zoom included only when the
   * user has turned it on. The list is rebuilt only when that setting changes,
   * as a new list resets the map's interactions.
   */
  protected interactions(): { name: string }[] {
    const doubleClickZoom = !!this.app.config.map.doubleClickZoom;
    if (doubleClickZoom !== this.interactionsFor) {
      this.interactionsFor = doubleClickZoom;
      this.interactionList = mapInteractions(doubleClickZoom);
    }
    return this.interactionList;
  }

  /** Keys act on the chart that has focus, as on the main chart. */
  protected onKeydown(e: KeyboardEvent) {
    this.split.activate('secondary');
    const direction = zoomKeyDirection(e);
    if (direction) {
      e.preventDefault();
      this.onCommand({ kind: 'zoom', step: direction === 'in' ? 1 : -1 });
    } else if (isPanKey(e)) {
      // Following would pull the view straight back, as a drag does.
      this.onDrag();
    }
  }

  // ---------- shared map buttons ----------

  private onCommand(c: PaneCommand) {
    const { min, max } = this.app.MAP_ZOOM_EXTENT;
    const clampZoom = (z: number) => Math.min(max, Math.max(min, z));
    if (c.kind === 'zoom') {
      this.zoom.set(clampZoom(this.zoom() + c.step));
      return;
    }
    // Following would pull the view straight back to the vessel.
    if (this.split.follow()) {
      this.split.setFollow(false);
    }
    this.center.set([...c.position] as Position);
    // A zoom that comes with a place is the least it needs to show (a note
    // shows only from the notes zoom on): it never zooms the pane out.
    if (typeof c.zoom === 'number' && c.zoom > this.zoom()) {
      this.zoom.set(clampZoom(c.zoom));
    }
  }

  /**
   * Centres the pane on the vessel the main chart follows (own ship, or the
   * one in focus) once it has a position. Returns false until then.
   */
  private centerOnVessel(): boolean {
    const vessel = this.app.data.vessels.active;
    if (!vessel?.positionReceived || !Array.isArray(vessel.position)) {
      return false;
    }
    this.center.set([...vessel.position] as Position);
    return true;
  }

  // ---------- divider ----------

  /** The main chart's share of the panel, as the divider reports it. */
  protected splitPercent(): number {
    return Math.round(this.split.shownRatio() * 100);
  }

  protected gripDown(ev: PointerEvent) {
    const container = this.host.nativeElement.parentElement;
    if (!container) {
      return;
    }
    this.gripRect = container.getBoundingClientRect();
    this.gripStacked = this.split.stacked();
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

  /**
   * Both maps resize with the divider, so it moves at most once a frame,
   * and is saved only when the drag ends.
   */
  protected gripMove(ev: PointerEvent) {
    if (!this.gripRect) {
      return;
    }
    const ratio = ratioFromPointer(
      this.gripRect,
      ev.clientX,
      ev.clientY,
      this.gripStacked
    );
    if (ratio === null) {
      return;
    }
    cancelAnimationFrame(this.gripFrame);
    this.gripFrame = requestAnimationFrame(() =>
      this.split.setRatio(ratio, false)
    );
  }

  protected gripUp() {
    if (this.gripRect) {
      this.gripRect = null;
      this.split.save();
    }
  }

  /** The divider as a window splitter: arrows move it, Home and End to the ends. */
  protected gripKey(ev: KeyboardEvent) {
    const stacked = this.split.stacked();
    const back = stacked ? 'ArrowUp' : 'ArrowLeft';
    const forward = stacked ? 'ArrowDown' : 'ArrowRight';
    const ratio =
      ev.key === 'Home'
        ? SPLIT_RATIO_MIN
        : ev.key === 'End'
          ? SPLIT_RATIO_MAX
          : ev.key === back
            ? this.split.shownRatio() - 0.05
            : ev.key === forward
              ? this.split.shownRatio() + 0.05
              : null;
    if (ratio !== null) {
      ev.preventDefault();
      this.split.setRatio(ratio);
    }
  }

  // ---------- data ----------

  private onVessels() {
    if (this.split.follow()) {
      this.centerOnVessel();
    }
    const vessel = this.app.data.vessels.active;
    if (typeof vessel.orientation === 'number') {
      this.heading.set(vessel.orientation);
    }
  }

  // OpenLayers calls this outside the Angular zone; the signal carries it in.
  private onMainMoved = () => this.updateFootprint();

  private updateFootprint() {
    const main = this.mainMap;
    const ring = main ? viewFootprint(main) : null;
    if (!main || !ring) {
      this.footprint.set(null);
      return;
    }
    // In the primary world, so the pane's wrapped copies show it wherever the
    // main chart has been panned to: OL repeats it only one world either side.
    const view = main.getView();
    const offset = worldCopyOffset(
      view.getCenter()[0],
      getWidth(view.getProjection().getExtent())
    );
    this.footprint.set(ring.map(([x, y]) => [x - offset, y]));
  }
}
