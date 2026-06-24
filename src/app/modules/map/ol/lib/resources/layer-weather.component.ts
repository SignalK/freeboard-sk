import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { Subscription } from 'rxjs';

import { WeatherService } from 'src/app/modules/weather/weather.service';
import { MapComponent } from '../map.component';

@Component({
  selector: 'ol-map > fb-weather',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LayerWeatherComponent implements OnChanges, OnDestroy {
  @Input() show = false;
  @Input() opacity = 0.65;

  private layer: TileLayer<XYZ>;
  private tileUrlSub: Subscription;
  private refreshHandle: number;
  private readonly zIndex = 50;
  private readonly refreshIntervalMs = 10 * 60 * 1000;

  constructor(
    private mapComponent: MapComponent,
    private weather: WeatherService,
    changeDetectorRef: ChangeDetectorRef
  ) {
    changeDetectorRef.detach();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (typeof changes.opacity !== 'undefined' && this.layer) {
      this.layer.setOpacity(this.normalizedOpacity);
    }

    if (this.show) {
      this.addLayer();
    } else {
      this.removeLayer();
    }
  }

  ngOnDestroy() {
    this.removeLayer();
  }

  private addLayer() {
    if (this.layer) {
      this.layer.setOpacity(this.normalizedOpacity);
      return;
    }

    this.refreshLayerSource();
    this.startRefresh();
  }

  private refreshLayerSource() {
    this.tileUrlSub?.unsubscribe();
    this.tileUrlSub = this.weather.getLatestRainViewerRadarUrl().subscribe({
      next: (url) => {
        if (!this.show) {
          return;
        }

        if (this.layer) {
          this.layer.setSource(this.createSource(url));
        } else {
          this.layer = new TileLayer({
            source: this.createSource(url),
            opacity: this.normalizedOpacity,
            preload: 0,
            zIndex: this.zIndex
          });
          this.layer.set('id', 'rainviewer-weather-radar');
          this.layer.set('name', 'RainViewer Weather Radar');
          this.mapComponent.getMap().addLayer(this.layer);
        }
        this.mapComponent.getMap().render();
      },
      error: (err) => console.warn('RainViewer radar layer unavailable.', err)
    });
  }

  private startRefresh() {
    if (this.refreshHandle) {
      return;
    }
    this.refreshHandle = window.setInterval(
      () => this.refreshLayerSource(),
      this.refreshIntervalMs
    );
  }

  private removeLayer() {
    this.tileUrlSub?.unsubscribe();
    if (this.refreshHandle) {
      window.clearInterval(this.refreshHandle);
      this.refreshHandle = undefined;
    }

    const map = this.mapComponent.getMap();
    if (!map || !this.layer) {
      return;
    }

    map.removeLayer(this.layer);
    this.layer = undefined;
    map.render();
  }

  private get normalizedOpacity() {
    return Math.max(0, Math.min(1, this.opacity ?? 1));
  }

  private createSource(url: string) {
    return new XYZ({
      url,
      crossOrigin: 'anonymous',
      maxZoom: 7,
      transition: 0
    });
  }
}
