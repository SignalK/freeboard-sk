import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  Output,
  OnChanges,
  OnInit,
  SimpleChanges,
  ChangeDetectorRef,
  OnDestroy,
  inject,
  output
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Coordinate } from '../models';
import { BehaviorSubject, AsyncSubject } from 'rxjs';
import ImageLayer from 'ol/layer/Image';
import { RadarRenderService } from './radar-render.service';
import { ShipState } from './ship-state.model';
import { MapComponent } from '../map.component';

// ** Freeboard Radar component **
@Component({
  selector: 'ol-map > fb-radar',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RadarComponent implements OnInit, OnChanges, OnDestroy {
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();
  @Input() position: Coordinate;
  @Input() heading = 0;
  @Input() mapZoom: number;
  @Input() zIndex: number;
  @Input() visible: boolean;
  @Input() layerProperties: Record<string, unknown>;
  @Input() opacity: number = 1;

  onError = output<Error>();

  private state: ShipState = { location: [0, 0], heading: 0 };
  private subject = new BehaviorSubject<ShipState>({
    location: [0, 0],
    heading: 0
  });
  protected layer: Layer;

  private radarRenderService = inject(RadarRenderService);
  protected mapComponent = inject(MapComponent);
  protected changeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    this.changeDetectorRef.detach();
  }

  parseOpacity(value: number = this.opacity): number {
    let o = value ?? 1;
    o = Math.max(Math.min(o, 1), 0);
    return o;
  }

  ngOnInit() {
    this.layer = new ImageLayer({
      zIndex: this.zIndex,
      visible: this.visible,
      opacity: this.parseOpacity(),
      ...this.layerProperties
    });

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }

    if (!document.hidden) {
      this.startStream();
    }
  }

  // The spoke stream tells the radar provider that someone is watching the
  // radar, and it may let an unwatched radar stand down. So the stream is
  // held only while this page is actually on screen: a backgrounded tab or
  // a phone in a pocket must not keep the radar transmitting.
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!this.layer) {
      return;
    }
    if (document.hidden) {
      this.stopStream();
    } else {
      this.startStream();
    }
  }

  private startStream() {
    this.radarRenderService
      .connect()
      .then((radar) => {
        if (radar && this.layer) {
          this.layer.setSource(
            this.radarRenderService.createRadarSource(radar, this.subject)
          );
        }
      })
      .catch((error) => this.onError.emit(error));
  }

  private stopStream() {
    this.radarRenderService.disconnect();
    this.layer?.setSource(null);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      if (changes['opacity']) {
        this.layer.setOpacity(
          this.parseOpacity(changes['opacity'].currentValue)
        );
      }
      if (changes['position'] || changes['heading']) {
        if (changes['position']) {
          const position = changes['position'].currentValue;
          this.state.location = position;
        }
        if (changes['heading']) {
          this.state.heading =
            changes['heading'].currentValue * (180 / Math.PI);
        }
        this.subject.next(this.state);
      }
    }
  }

  ngOnDestroy() {
    this.stopStream();
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }
}
