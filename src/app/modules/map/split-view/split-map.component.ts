import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  NgZone,
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
  FBMapEvent,
  FBPointerEvent
} from 'src/app/modules/map/ol/lib/map.component';
import { MapReadyEvent } from 'src/app/modules/map/ol/lib/models';
import { Position } from 'src/app/types';
import { FBMapInteractService } from '../fbmap-interact.service';
import { mapControls, mapInteractions } from '../mapconfig';
import { isPanKey } from 'src/app/lib/pan-keys';
import { zoomKeyDirection } from 'src/app/lib/zoom-keys';
import { mirrorLayers } from './layer-mirror';
import {
  fitRatio,
  ratioFromPointer,
  SPLIT_RATIO_MAX,
  SPLIT_SHARE_VAR,
  SPLIT_RATIO_MIN,
  viewFootprint
} from './split-view';
import { PaneCommand, SplitPane, SplitViewService } from './split-view.service';

/** A chart drawn bigger than its pane while the divider is dragged. */
interface Overscan {
  map: OlMap;
  target: HTMLElement;
  /** Its length along the split when the drag began, and as drawn. */
  shown: number;
  max: number;
  /** 1 when it grows with the main chart's share, -1 when it shrinks. */
  grows: 1 | -1;
  /**
   * The chart's controls (the scale bar, zoom buttons, position readout), and
   * how each follows its pane's size: 0 pinned to the start, 1 to the end,
   * 0.5 to the middle. They are moved so they stay where they will be.
   */
  controls: { el: HTMLElement; k: number }[];
  style: Pick<
    CSSStyleDeclaration,
    'width' | 'height' | 'transform' | 'willChange'
  >;
}

/**
 * The outermost positioned elements at or under `el`. Moving those moves a
 * control (most are inline Angular elements, which a transform cannot move)
 * without changing where anything inside it is placed.
 */
function positioned(el: Element): HTMLElement[] {
  return getComputedStyle(el).position !== 'static'
    ? [el as HTMLElement]
    : [...el.children].flatMap(positioned);
}

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
  private gripRatio: number | null = null;
  protected readonly ratioMin = Math.round(SPLIT_RATIO_MIN * 100);
  protected readonly ratioMax = Math.round(SPLIT_RATIO_MAX * 100);
  private vessels: Subscription;
  private commands: Subscription;
  private pressedAt = 0;
  private gripRect: DOMRect | null = null;
  private gripStacked = false;
  private gripStart = 0;
  private overscans: Overscan[] = [];
  private endDrag: (() => void) | null = null;
  private zone = inject(NgZone);
  protected dragging = signal(false);

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
    this.endDrag?.();
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

  /** The main chart's position readout follows the pointer here too. */
  protected onPointerMove(e: FBPointerEvent) {
    this.split.forwardPointer(e.lonlat as Position);
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
      map,
      zoom: map.getView().getZoom() ?? this.zoom()
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

  /**
   * The panes resize live with the divider, for the cost of two renders a
   * drag. Each chart is drawn once, at the largest size this drag can give it,
   * and shown through its pane; every frame only moves it so its centre stays
   * mid-pane, as OL keeps the centre of a resized map. So each frame shows the
   * chart as it will look at that size, and when the drag ends both are drawn
   * at their real size, which looks the same.
   */
  protected gripDown(ev: PointerEvent) {
    const panel = this.host.nativeElement.parentElement;
    if (!panel) {
      return;
    }
    this.gripRect = panel.getBoundingClientRect();
    this.gripStacked = this.split.stacked();
    this.gripRatio = null;
    const grip = ev.currentTarget as HTMLElement;
    grip.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
    this.dragging.set(true);
    const size = this.gripStacked ? this.gripRect.height : this.gripRect.width;
    const start = this.split.shownRatio();
    this.gripStart = start;
    this.overscans = [
      this.overscan(
        this.mainMap,
        (fitRatio(SPLIT_RATIO_MAX, size) - start) * size,
        1
      ),
      this.overscan(
        this.map,
        (start - fitRatio(SPLIT_RATIO_MIN, size)) * size,
        -1
      )
    ].filter((o): o is Overscan => o !== null);
    // Moves come at pointer rate: outside Angular they set a few style
    // properties and run no change detection.
    this.zone.runOutsideAngular(() => {
      const move = (e: PointerEvent) => this.gripMove(e);
      const end = () => this.zone.run(() => this.gripUp());
      const ends = ['pointerup', 'pointercancel', 'lostpointercapture'];
      grip.addEventListener('pointermove', move);
      ends.forEach((type) => grip.addEventListener(type, end));
      this.endDrag = () => {
        grip.removeEventListener('pointermove', move);
        ends.forEach((type) => grip.removeEventListener(type, end));
        cancelAnimationFrame(this.gripFrame);
        // Drawn at their real size while the panel still has the dragged
        // share; the share goes once the ratio has been set.
        this.overscans.forEach((o) => this.release(o));
        this.overscans = [];
        panel.style.removeProperty(SPLIT_SHARE_VAR);
      };
    });
  }

  /**
   * Gives the main chart its share of the panel through a CSS variable, and
   * moves each chart within its pane, once a frame. The ratio itself is set,
   * and saved, when the drag ends.
   */
  protected gripMove(ev: PointerEvent) {
    const panel = this.host.nativeElement.parentElement;
    if (!this.gripRect || !panel) {
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
    this.gripRatio = ratio;
    const size = this.gripStacked ? this.gripRect.height : this.gripRect.width;
    const share = fitRatio(ratio, size);
    const moved = (share - this.gripStart) * size;
    cancelAnimationFrame(this.gripFrame);
    this.gripFrame = requestAnimationFrame(() => {
      panel.style.setProperty(SPLIT_SHARE_VAR, `${share * 100}%`);
      this.overscans.forEach((o) => this.shift(o, o.shown + o.grows * moved));
    });
  }

  /** Sets and saves where the divider was let go, and ends the drag. */
  protected gripUp() {
    if (!this.gripRect) {
      return;
    }
    this.gripRect = null;
    if (this.gripRatio !== null) {
      this.split.setRatio(this.gripRatio);
      this.gripRatio = null;
    }
    this.endDrag?.();
    this.endDrag = null;
    this.dragging.set(false);
    this.updateFootprint();
  }

  /**
   * Draws `map` `growth` px longer along the split than its pane, now, so the
   * pane can grow that much without the chart being drawn again.
   */
  private overscan(
    map: OlMap | undefined,
    growth: number,
    grows: 1 | -1
  ): Overscan | null {
    const target = map?.getTargetElement();
    if (!map || !target) {
      return null;
    }
    const axis = this.gripStacked ? 'height' : 'width';
    const shown = target.getBoundingClientRect()[axis];
    const max = Math.round(shown + Math.max(0, growth));
    const { width, height, transform, willChange } = target.style;
    const controls = [...(map.getOverlayContainerStopEvent()?.children ?? [])]
      .filter((el) => !el.classList.contains('ol-overlay-container'))
      .flatMap(positioned);
    const middle = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return this.gripStacked ? r.top + r.height / 2 : r.left + r.width / 2;
    };
    const before = controls.map(middle);
    target.style[axis] = `${max}px`;
    const o: Overscan = {
      map,
      target,
      shown,
      max,
      grows,
      controls: controls.map((el, i) => ({
        el,
        k: max > shown ? (middle(el) - before[i]) / (max - shown) : 0
      })),
      style: { width, height, transform, willChange }
    };
    target.style.willChange = 'transform';
    this.shift(o, shown);
    // Drawn now, before the frame is painted, so it never shows misplaced.
    map.updateSize();
    map.renderSync();
    return o;
  }

  /**
   * Moves an overscanned chart so its centre is mid-pane in a pane `shown` px
   * long, and its controls to where they sit in a pane that long.
   */
  private shift(o: Overscan, shown: number) {
    const by = Math.round((shown - o.max) / 2);
    o.target.style.transform = this.gripStacked
      ? `translateY(${by}px)`
      : `translateX(${by}px)`;
    o.controls.forEach(({ el, k }) => {
      const back = Math.round((2 * k - 1) * by);
      el.style.translate = this.gripStacked ? `0 ${back}px` : `${back}px 0`;
    });
  }

  /** Back to filling its pane, drawn at that size before the next paint. */
  private release(o: Overscan) {
    Object.assign(o.target.style, o.style);
    o.controls.forEach(({ el }) => (el.style.translate = ''));
    o.map.updateSize();
    o.map.renderSync();
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
  // While the divider is dragged the main chart is drawn bigger than it shows
  // (see gripDown); its outline is redrawn once the drag ends.
  private onMainMoved = () => {
    if (!this.dragging()) {
      this.updateFootprint();
    }
  };

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
