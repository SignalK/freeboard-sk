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
import { createEmpty } from 'ol/extent';
import { get as getProjection } from 'ol/proj';
import { MapComponent } from '../map.component';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import type { OverlayFrameDelivery } from 'src/app/modules/plotterext/overlay-registry';
import { needsNewFrame, overlayView, RequestedView } from './overlay-geometry';

/**
 * One image map overlay (capability `overlays.image`): an OL image layer whose
 * picture an extension's background runtime draws. On every settled view
 * change that needs it, the layer asks the runtime for a frame of the north-up
 * box covering the view; each accepted frame is drawn into the layer's canvas
 * and placed at its extent, in the world copy on screen. Between frames OL
 * moves, scales and rotates the last one with the map.
 *
 * The same placement as the radar layer (`ImageSource` + a mutable
 * `imageExtent`), fed by the bus instead of a worker.
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
  private source: ImageSource | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private readonly imageExtent = createEmpty();
  private lastRequested: RequestedView | null = null;
  private listenerKeys: EventsKey[] = [];
  private unregisterSink: (() => void) | null = null;

  constructor() {
    inject(ChangeDetectorRef).detach();
  }

  ngOnInit() {
    const map = this.mapComponent.getMap();
    if (!map) return;
    this.canvas = document.createElement('canvas');
    const canvas = this.canvas;
    this.source = new ImageSource({
      projection: getProjection('EPSG:3857'),
      loader: createLoader({
        imageExtent: this.imageExtent,
        url: '',
        load: () => Promise.resolve(canvas)
      })
    });
    this.layer = new ImageLayer({
      source: this.source,
      zIndex: this.zIndex,
      opacity: this.clampOpacity(this.opacity),
      // nothing to show until the first frame arrives
      visible: false,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom
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
    if (changes['minZoom']) {
      this.layer.setMinZoom(this.minZoom ?? -Infinity);
    }
    if (changes['maxZoom']) {
      this.layer.setMaxZoom(this.maxZoom ?? Infinity);
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
    this.source = null;
    if (this.canvas) {
      // release the backing store now rather than at GC (iOS canvas budget)
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas = null;
    }
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
    if (!this.inZoomRange(zoom)) return;
    const next: RequestedView = {
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
    this.lastRequested = next;
    this.plotterExt.requestOverlayFrame(
      this.overlayKey,
      req.view,
      req.worldOffset
    );
  }

  private draw(frame: OverlayFrameDelivery) {
    if (!this.canvas || !this.layer || !this.source) {
      frame.image.close();
      return;
    }
    const { image, extent } = frame;
    if (this.canvas.width !== image.width) this.canvas.width = image.width;
    if (this.canvas.height !== image.height) this.canvas.height = image.height;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, image.width, image.height);
      ctx.drawImage(image, 0, 0);
    }
    image.close();
    this.imageExtent[0] = extent[0];
    this.imageExtent[1] = extent[1];
    this.imageExtent[2] = extent[2];
    this.imageExtent[3] = extent[3];
    this.layer.setVisible(true);
    this.source.refresh();
  }
}
