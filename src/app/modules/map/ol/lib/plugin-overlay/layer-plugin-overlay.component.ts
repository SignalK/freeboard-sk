import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject
} from '@angular/core';
import type { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import ImageLayer from 'ol/layer/Image';
import type Layer from 'ol/layer/Layer';
import ImageSource from 'ol/source/Image';
import type CanvasImageLayerRenderer from 'ol/renderer/canvas/ImageLayer';
import { get as getProjection } from 'ol/proj';
import { MapComponent } from '../map.component';
import { ON_TWIN, OnTwin, RESIZING } from '../util';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import type { OverlayFrameDelivery } from 'src/app/modules/plotterext/overlay-registry';
import {
  needsNewFrame,
  overlayView,
  RequestedView,
  ViewState
} from './overlay-geometry';
import { FrameBitmaps, frameSource } from './frame-bitmaps';

/**
 * One image map overlay (capability `overlays.image`): an OL image layer whose
 * picture an extension's background runtime draws. On every settled view
 * change that needs it, the layer asks the runtime for a frame of the north-up
 * box covering the view; each accepted frame is placed at its extent, in the
 * world copy on screen. Between frames OL moves, scales and rotates the last
 * one with the map.
 *
 * Each frame gets its own static `ImageSource` whose image is the transferred
 * `ImageBitmap` itself (see {@link frameSource}). OL keeps drawing the previous
 * image until the new one has loaded, so swapping sources does not flicker;
 * {@link FrameBitmaps} closes bitmaps by what the renderers actually draw: this
 * layer's, and those of its twins drawing the same frames on another map (the
 * split view's second pane), which tell the layer they exist through
 * {@link ON_TWIN}.
 */
@Component({
  selector: 'ol-map > fb-plugin-overlay',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PluginOverlayComponent implements OnInit, OnChanges, OnDestroy {
  /** `<extension>/<overlay id>` */
  @Input({ required: true }) overlayKey!: string;
  @Input({ required: true }) zIndex!: number;
  @Input() opacity = 1;
  @Input() minZoom: number | undefined;
  @Input() maxZoom: number | undefined;
  @Input() preferredPixelRatio: number | undefined;

  private plotterExt = inject(PlotterExtensionService);
  private mapComponent = inject(MapComponent);

  private layer: ImageLayer<ImageSource> | null = null;
  private readonly twins = new Set<Layer>();
  // OL registers EPSG:3857 itself
  private projection = getProjection('EPSG:3857')!;
  private readonly bitmaps = new FrameBitmaps();
  private lastRequested: RequestedView | null = null;
  private hasFrame = false;
  private listenerKeys: EventsKey[] = [];
  private unregisterSink: (() => void) | null = null;

  constructor() {
    inject(ChangeDetectorRef).detach();
  }

  ngOnInit() {
    const map = this.mapComponent.getMap();
    if (!map) return;
    this.layer = new ImageLayer({
      zIndex: this.zIndex,
      opacity: this.clampOpacity(this.opacity),
      // nothing to show until the first frame arrives; the zoom range is gated
      // here rather than by OL, whose minZoom is exclusive
      visible: false,
      properties: { [ON_TWIN]: ((twin) => this.addTwin(twin)) as OnTwin }
    });
    map.addLayer(this.layer);
    this.listenerKeys.push(
      this.layer.on('postrender', () =>
        this.bitmaps.rendered(this.drawnBitmaps())
      )
    );
    this.unregisterSink = this.plotterExt.overlays.registerSink(
      this.overlayKey,
      (frame) => this.draw(frame)
    );
    // Not for a view the map only passes through while drawn larger than it
    // shows (the split view's divider being dragged).
    const viewChanged = () => {
      if (!map.get(RESIZING)) {
        this.requestIfNeeded();
      }
    };
    this.listenerKeys.push(
      map.on('moveend', viewChanged),
      map.on('change:size', viewChanged)
    );
    this.requestIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.layer) return;
    if (changes['opacity']) {
      this.layer.setOpacity(this.clampOpacity(this.opacity));
    }
    if (changes['zIndex']) {
      this.layer.setZIndex(this.zIndex);
    }
    if (
      changes['minZoom'] ||
      changes['maxZoom'] ||
      changes['preferredPixelRatio']
    ) {
      this.lastRequested = null;
      this.requestIfNeeded();
    }
  }

  ngOnDestroy() {
    unByKey(this.listenerKeys);
    this.listenerKeys = [];
    this.unregisterSink?.();
    this.plotterExt.overlays.clearRequest(this.overlayKey);
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
    }
    this.layer = null;
    // release the bitmaps now rather than at GC (iOS canvas budget)
    this.bitmaps.clear();
  }

  /** The bitmap each renderer of this overlay is drawing, if any. */
  private drawnBitmaps(): unknown[] {
    return [this.layer, ...this.twins].map(
      (layer) =>
        (
          layer?.getRenderer() as CanvasImageLayerRenderer | undefined
        )?.getImage() ?? null
    );
  }

  /**
   * A twin draws this overlay's frames on another map. Until it is gone, the
   * bitmap it draws stays open: during a gesture on its map it keeps drawing
   * that one while this layer moves on.
   */
  private addTwin(twin: Layer): () => void {
    this.twins.add(twin);
    const key = twin.on('postrender', () =>
      this.bitmaps.rendered(this.drawnBitmaps())
    );
    return () => {
      unByKey(key);
      this.twins.delete(twin);
      this.bitmaps.rendered(this.drawnBitmaps());
    };
  }

  private clampOpacity(v: number) {
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  }

  private inZoomRange(zoom: number | undefined) {
    if (zoom === undefined) return false;
    if (this.minZoom !== undefined && zoom < this.minZoom) return false;
    if (this.maxZoom !== undefined && zoom > this.maxZoom) return false;
    return true;
  }

  private requestIfNeeded() {
    const map = this.mapComponent.getMap();
    const view = map?.getView();
    const size = map?.getSize();
    if (!view || !size || !(size[0] > 0 && size[1] > 0)) return;
    const zoom = view.getZoom();
    this.updateVisibility(zoom);
    if (!this.inZoomRange(zoom)) return;
    const next: ViewState = {
      extent: view.calculateExtent(size),
      size,
      resolution: view.getResolution() ?? NaN,
      rotation: view.getRotation()
    };
    if (!needsNewFrame(this.lastRequested, next)) return;
    const req = overlayView({
      extent: next.extent,
      resolution: next.resolution,
      rotation: next.rotation,
      zoom: zoom as number,
      devicePixelRatio: window.devicePixelRatio,
      preferredPixelRatio: this.preferredPixelRatio
    });
    if (!req) return;
    const [x0, y0, x1, y1] = req.view.extent;
    this.lastRequested = {
      box: [x0 + req.worldOffset, y0, x1 + req.worldOffset, y1],
      size: next.size,
      resolution: next.resolution,
      rotation: next.rotation
    };
    this.plotterExt.requestOverlayFrame(
      this.overlayKey,
      req.view,
      req.worldOffset
    );
  }

  private draw(frame: OverlayFrameDelivery) {
    const zoom = this.mapComponent.getMap()?.getView().getZoom();
    // a hidden layer is not rendered, so its frames would never be drawn
    if (!this.layer || !this.inZoomRange(zoom)) {
      frame.image.close();
      return;
    }
    this.bitmaps.add(frame.image, this.drawnBitmaps());
    this.layer.setSource(
      frameSource(frame.image, frame.extent, this.projection)
    );
    this.hasFrame = true;
    this.updateVisibility(zoom);
  }

  /** Shown once a frame has arrived, and only within the zoom range. */
  private updateVisibility(zoom: number | undefined) {
    this.layer?.setVisible(this.hasFrame && this.inZoomRange(zoom));
  }
}
