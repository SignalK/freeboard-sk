import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
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
import { mapControls } from '../mapconfig';
import { mirrorLayers } from './layer-mirror';
import { ratioFromPointer, viewFootprint } from './split-view';
import { SplitViewService } from './split-view.service';

/**
 * The second chart pane of the split view: everything the main chart shows,
 * with a view of its own and the main chart's viewport outlined on it. Its
 * layers mirror the main chart's (see layer-mirror), and its taps are handled
 * by the main chart, so popovers and menus work the same in both panes.
 */
@Component({
  selector: 'fb-split-map',
  imports: [
    FreeboardOpenlayersModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './split-map.component.html',
  styleUrls: ['./split-map.component.css']
})
export class SplitMapComponent implements OnInit, OnDestroy {
  protected app = inject(AppFacade);
  protected skstream = inject(SKStreamFacade);
  protected split = inject(SplitViewService);
  private mapInteract = inject(FBMapInteractService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  // The main chart's set, minus pinch-rotate: rotation is the orientation
  // button's job.
  protected readonly olInteractions = [
    { name: 'dragpan' },
    { name: 'dragzoom' },
    { name: 'keyboardpan' },
    { name: 'mousewheelzoom' },
    { name: 'pinchzoom' },
    { name: 'doubleclickzoom' }
  ];
  protected readonly olControls = mapControls;

  protected zoom = signal<number>(10);
  protected center = signal<Position>([0, 0]);
  protected selfPosition = signal<Position>([0, 0]);
  protected heading = signal<number>(0);
  protected rotation = computed(() =>
    this.split.northUp() ? 0 : 0 - this.heading()
  );
  protected footprint = signal<Coordinate[] | null>(null);

  private map: OlMap | undefined;
  private mainMap: OlMap | undefined;
  private stopMirror: (() => void) | undefined;
  private vessels: Subscription;
  private gripRect: DOMRect | null = null;
  private gripStacked = false;

  ngOnInit() {
    const self = this.app.data.vessels.self;
    if (Array.isArray(self.position)) {
      this.selfPosition.set(self.position);
    }
    this.heading.set(self.orientation ?? 0);

    const { min } = this.app.MAP_ZOOM_EXTENT;
    const last = this.split.lastView();
    this.zoom.set(
      last.zoom ?? Math.max(min, this.app.config.map.zoomLevel - 3)
    );
    this.center.set(
      this.split.follow() || !last.center ? this.selfPosition() : last.center
    );

    this.vessels = this.skstream.vessels$().subscribe(() => this.onVessels());
  }

  ngOnDestroy() {
    this.vessels?.unsubscribe();
    this.stopMirror?.();
    this.mainMap?.un('moveend', this.updateFootprint);
    this.mainMap?.un('change:size', this.updateFootprint);
    this.split.setSecondaryMap(null);
  }

  protected onMapReady(e: MapReadyEvent) {
    this.map = e.map;
    // Both maps are registered by now; the main chart is the one that isn't ours.
    this.mainMap = e.mapService.getMaps().find((m) => m !== e.map);
    if (this.mainMap) {
      this.stopMirror = mirrorLayers(this.mainMap, e.map);
      this.mainMap.on('moveend', this.updateFootprint);
      this.mainMap.on('change:size', this.updateFootprint);
    }
    this.updateFootprint();
    this.split.setSecondaryMap(e.map);
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

  protected onTap(e: FBClickEvent) {
    if (this.map && !this.interacting()) {
      this.split.forwardTap({ kind: 'click', event: e, map: this.map });
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

  protected toggleNorthUp() {
    this.split.setNorthUp(!this.split.northUp());
  }

  protected toggleFollow() {
    const follow = !this.split.follow();
    this.split.setFollow(follow);
    if (follow) {
      this.center.set([...this.selfPosition()] as Position);
    }
  }

  protected zoomBy(step: number) {
    const { min, max } = this.app.MAP_ZOOM_EXTENT;
    this.zoom.set(Math.min(max, Math.max(min, Math.round(this.zoom()) + step)));
  }

  protected close() {
    this.split.toggle();
  }

  // ---------- divider ----------

  protected gripDown(ev: PointerEvent) {
    const container = this.host.nativeElement.parentElement;
    if (!container) {
      return;
    }
    this.gripRect = container.getBoundingClientRect();
    this.gripStacked = this.isStacked(container);
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

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
    if (ratio !== null) {
      this.split.setRatio(ratio);
    }
  }

  protected gripUp() {
    this.gripRect = null;
  }

  protected gripKey(ev: KeyboardEvent) {
    const container = this.host.nativeElement.parentElement;
    const stacked = container ? this.isStacked(container) : false;
    const step =
      ev.key === (stacked ? 'ArrowUp' : 'ArrowLeft')
        ? -0.05
        : ev.key === (stacked ? 'ArrowDown' : 'ArrowRight')
          ? 0.05
          : 0;
    if (step) {
      ev.preventDefault();
      this.split.setRatio(this.split.ratio() + step);
    }
  }

  private isStacked(container: HTMLElement): boolean {
    return getComputedStyle(container).flexDirection === 'column';
  }

  // ---------- data ----------

  private onVessels() {
    const self = this.app.data.vessels.self;
    if (Array.isArray(self.position)) {
      this.selfPosition.set(self.position);
      if (this.split.follow()) {
        this.center.set([...self.position] as Position);
      }
    }
    if (typeof self.orientation === 'number') {
      this.heading.set(self.orientation);
    }
  }

  // OpenLayers calls this outside the Angular zone; the signal carries it in.
  private updateFootprint = () => {
    this.footprint.set(this.mainMap ? viewFootprint(this.mainMap) : null);
  };
}
