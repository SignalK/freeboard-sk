import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style, Text } from 'ol/style';
import {
  Observable,
  Subject,
  Subscription,
  catchError,
  debounceTime,
  of,
  switchMap,
  tap
} from 'rxjs';
import { FeatureLike } from 'ol/Feature';
import { fromLonLat, transformExtent } from 'ol/proj';

import {
  WeatherService,
  WeatherWindSample
} from 'src/app/modules/weather/weather.service';
import { AppFacade } from 'src/app/app.facade';
import { WindIndicator } from 'src/app/types';
import { meteoWindBucket } from 'src/app/modules/icons';
import { MapComponent } from '../map.component';
import { MapImageRegistry } from '../map-image-registry.service';

@Component({
  selector: 'ol-map > fb-weather-wind',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LayerWindWeatherComponent implements OnChanges, OnDestroy {
  @Input() show = false;
  @Input() opacity = 0.55;
  @Input() indicator: WindIndicator = 'barb';

  private layer: VectorLayer<VectorSource>;
  private source: VectorSource;
  private refresh$ = new Subject<void>();
  private refreshSub: Subscription;
  private readonly zIndex = 55;
  private readonly gridColumns = 5;
  private readonly gridRows = 4;

  constructor(
    private mapComponent: MapComponent,
    private weather: WeatherService,
    private mapImages: MapImageRegistry,
    private app: AppFacade,
    changeDetectorRef: ChangeDetectorRef
  ) {
    changeDetectorRef.detach();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (typeof changes.opacity !== 'undefined' && this.layer) {
      this.layer.setOpacity(this.normalizedOpacity);
    }

    if (changes.indicator && !changes.indicator.firstChange) {
      this.layer?.changed();
    }

    if (this.show) {
      this.addLayer();
    } else {
      this.removeLayer();
    }
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    this.removeLayer();
  }

  private addLayer() {
    if (this.layer) {
      this.layer.setOpacity(this.normalizedOpacity);
      this.refresh$.next();
      return;
    }

    this.source = new VectorSource();
    this.layer = new VectorLayer({
      source: this.source,
      opacity: this.normalizedOpacity,
      zIndex: this.zIndex,
      style: (feature) => this.createWindStyle(feature)
    });
    this.layer.set('id', 'signal-k-weather-wind');
    this.layer.set('name', 'Weather Wind');
    this.mapComponent.getMap().addLayer(this.layer);

    this.refreshSub = this.refresh$
      .pipe(
        debounceTime(400),
        switchMap(() => this.fetchWind())
      )
      .subscribe();
    this.mapComponent.getMap().on('moveend', this.onMoveEnd);
    this.refresh$.next();
    this.mapComponent.getMap().render();
  }

  private removeLayer() {
    const map = this.mapComponent.getMap();
    if (!map || !this.layer) {
      return;
    }

    map.un('moveend', this.onMoveEnd);
    this.refreshSub?.unsubscribe();
    this.refreshSub = undefined;
    map.removeLayer(this.layer);
    this.source?.clear();
    this.source = undefined;
    this.layer = undefined;
    map.render();
  }

  private onMoveEnd = () => {
    this.refresh$.next();
  };

  private get normalizedOpacity() {
    return Math.max(0, Math.min(1, this.opacity ?? 1));
  }

  private fetchWind() {
    if (!this.show || !this.source) {
      return of<WeatherWindSample[]>([]);
    }

    const points = this.getSamplePoints();
    if (points.length === 0) {
      return of<WeatherWindSample[]>([]);
    }

    return this.weather.getWindSamples(points).pipe(
      tap((samples) => this.renderWind(samples)),
      catchError((err) => {
        console.warn('SK Weather wind layer unavailable.', err);
        return of<WeatherWindSample[]>([]);
      })
    );
  }

  private getSamplePoints() {
    const map = this.mapComponent.getMap();
    const size = map.getSize();
    if (!size) {
      return [];
    }

    const extent = transformExtent(
      map.getView().calculateExtent(size),
      'EPSG:3857',
      'EPSG:4326'
    );
    const west = Math.max(-180, extent[0]);
    const south = Math.max(-80, extent[1]);
    const east = Math.min(180, extent[2]);
    const north = Math.min(80, extent[3]);
    const points: Array<{ latitude: number; longitude: number }> = [];

    for (let row = 0; row < this.gridRows; row++) {
      const latitude = north - ((north - south) * (row + 0.5)) / this.gridRows;
      for (let col = 0; col < this.gridColumns; col++) {
        const longitude =
          west + ((east - west) * (col + 0.5)) / this.gridColumns;
        points.push({ latitude, longitude });
      }
    }
    return points;
  }

  private renderWind(samples: WeatherWindSample[]) {
    this.source.clear();
    this.source.addFeatures(
      samples.map((sample) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([sample.longitude, sample.latitude])),
          speed: sample.speed,
          direction: sample.direction
        });
        return feature;
      })
    );
  }

  private createWindStyle(feature: FeatureLike) {
    // direction = radians the wind blows *from*; speed = m/s (both SK native).
    const directionFrom = Number(feature.get('direction')) || 0;
    const speedMs = Number(feature.get('speed')) || 0;
    return this.indicator === 'barb'
      ? this.createBarbStyle(directionFrom, speedMs)
      : this.createArrowStyle(directionFrom, speedMs);
  }

  private createArrowStyle(directionFrom: number, speedMs: number) {
    const image = this.mapImages.getWindArrow().clone();
    image.setRotation(directionFrom + Math.PI); // arrow points where wind flows to
    image.setRotateWithView(true);
    return new Style({ image, text: this.speedLabel(speedMs, 26) });
  }

  private createBarbStyle(directionFrom: number, speedMs: number) {
    // Barbs share the meteo-target glyph: speed selects the bucketed barb and the
    // staff points into the wind (its reported "from" direction).
    const image = this.mapImages.getMeteoIcon(speedMs).clone();
    if (meteoWindBucket(speedMs)) {
      image.setRotation(directionFrom);
    }
    image.setRotateWithView(true);
    return new Style({ image, text: this.speedLabel(speedMs, 10) });
  }

  // Wind speed shown for both indicators — the label is always displayed, in the
  // user's configured wind-speed units.
  private speedLabel(speedMs: number, offsetY: number) {
    return new Text({
      text: this.app.formatValueForDisplay(speedMs, 'm/s', {
        precision: 0,
        path: this.app.twsDisplayUnitPath()
      }),
      offsetY,
      font: '11px Roboto, Arial, sans-serif',
      fill: new Fill({ color: 'rgba(20, 60, 95, 0.95)' }),
      stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.9)', width: 3 })
    });
  }
}
