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
import ImageSource from 'ol/source/Image';
import { createLoader } from 'ol/source/static';
import { get as getProjection } from 'ol/proj';
import { MapComponent } from '../map.component';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import type { OverlayFrameDelivery } from 'src/app/modules/plotterext/overlay-registry';
import {
  needsNewFrame,
  overlayView,
  RequestedView,
  ViewState
} from './overlay-geometry';

/**
 * One image map overlay (capability `overlays.image`): an OL image layer whose
 * picture an extension's background runtime draws. On every settled view
 * change that needs it, the layer asks the runtime for a frame of the north-up
 * box covering the view; each accepted frame is placed at its extent, in the
 * world copy on screen. Between frames OL moves, scales and rotates the last
 * one with the map.
 *
 * Each frame gets its own static `ImageSource` whose image is the transferred
 * `ImageBitmap` itself (no copy). A static source computes its resolution once,
 * on first load, and `refresh()` never reloads it — so one long-lived source
 * with a mutable extent (the radar pattern) shows a frame drawn at another zoom
 * at the old scale. OL keeps drawing the previous image until the new one has
 * loaded, so swapping sources does not flicker.
 */
@Component({
  selector: 'ol-map > fb-plugin-overlay',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PluginOverlayComponent implements OnInit, OnChanges, OnDestroy {
  /** `<extension>/<overlay id>` */
  @Input() overlayKey: string;
  @Input() zIndex: number;
  @Input() opacity = 1;
  @Input() minZoom: number | undefined;
  @Input() maxZoom: number | undefined;

  private plotterExt = inject(PlotterExtensionService);
  private mapComponent = inject(MapComponent);

  private layer: ImageLayer<ImageSource> | null = null;
  private projection = getProjection('EPSG:3857');
  /** The bitmap on screen, and one still drawn until its successor loads. */
  private shown: ImageBitmap | null = null;
  private outgoing: ImageBitmap[] = [];
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
      visible: false
    });
    map.addLayer(this.layer);
    this.unregisterSink = this.plotterExt.overlays.registerSink(
      this.overlayKey,
      (frame) => this.draw(frame)
    );
    this.listenerKeys.push(
      map.on('moveend', () => this.requestIfNeeded()),
      map.on('change:size', () => this.requestIfNeeded())
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
    if (changes['minZoom'] || changes['maxZoom']) {
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
    this.shown?.close();
    this.shown = null;
    this.outgoing.forEach((b) => b.close());
    this.outgoing = [];
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
      devicePixelRatio: window.devicePixelRatio
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
    if (!this.layer) {
      frame.image.close();
      return;
    }
    const image = frame.image;
    const source = new ImageSource({
      projection: this.projection,
      loader: createLoader({
        imageExtent: frame.extent.slice(),
        url: '',
        load: () => Promise.resolve(image)
      })
    });
    // OL keeps drawing the previous bitmap until this one has loaded, so the
    // outgoing ones are closed only once the source still attached has loaded
    // (a frame arriving before then supersedes this one and cleans up itself),
    // and a render later, when OL can no longer be drawing them.
    if (this.shown) this.outgoing.push(this.shown);
    this.shown = image;
    source.once('imageloadend', () => {
      if (this.layer?.getSource() !== source) return;
      const done = this.outgoing;
      this.outgoing = [];
      requestAnimationFrame(() =>
        requestAnimationFrame(() => done.forEach((b) => b.close()))
      );
    });
    this.layer.setSource(source);
    this.hasFrame = true;
    this.updateVisibility(this.mapComponent.getMap()?.getView().getZoom());
  }

  /** Shown once a frame has arrived, and only within the zoom range. */
  private updateVisibility(zoom: number | undefined) {
    this.layer?.setVisible(this.hasFrame && this.inZoomRange(zoom));
  }
}
