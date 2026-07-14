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
  OceanCurrentSample
} from 'src/app/modules/weather/weather.service';
import { MapComponent } from '../map.component';
import { MapImageRegistry } from '../map-image-registry.service';

@Component({
  selector: 'ol-map > fb-weather-currents',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LayerCurrentsWeatherComponent implements OnChanges, OnDestroy {
  @Input() show = false;
  @Input() opacity = 0.55;

  private layer: VectorLayer<VectorSource>;
  private source: VectorSource;
  private refresh$ = new Subject<void>();
  private refreshSub: Subscription;
  private readonly zIndex = 56;
  private readonly gridColumns = 10;
  private readonly gridRows = 8;

  constructor(
    private mapComponent: MapComponent,
    private weather: WeatherService,
    private mapImages: MapImageRegistry,
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
      style: (feature) => this.createArrowStyle(feature)
    });
    this.layer.set('id', 'openmeteo-currents');
    this.layer.set('name', 'Open-Meteo Ocean Currents');
    this.mapComponent.getMap().addLayer(this.layer);

    this.refreshSub = this.refresh$
      .pipe(
        debounceTime(400),
        switchMap(() => this.fetchCurrents())
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

  private fetchCurrents() {
    if (!this.show || !this.source) {
      return of<OceanCurrentSample[]>([]);
    }

    const points = this.getSamplePoints();
    if (points.length === 0) {
      return of<OceanCurrentSample[]>([]);
    }

    return this.weather.getOceanCurrentSamples(points).pipe(
      tap((samples) => this.renderCurrents(samples)),
      catchError(() => of<OceanCurrentSample[]>([]))
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

  private renderCurrents(samples: OceanCurrentSample[]) {
    this.source.clear();
    this.source.addFeatures(
      samples.map((sample) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([sample.longitude, sample.latitude])),
          velocity: sample.velocity,
          direction: sample.direction
        });
        return feature;
      })
    );
  }

  private createArrowStyle(feature: FeatureLike) {
    const velocity = Number(feature.get('velocity')) || 0;
    const direction = Number(feature.get('direction')) || 0;
    const rotation = this.getFlowRotation(direction);

    const t = Math.min(1, velocity / 2);
    const r = Math.round(38 + t * 190);
    const g = Math.round(150 - t * 100);
    const b = Math.round(245 - t * 200);
    const color = `rgb(${r}, ${g}, ${b})`;

    const image = this.mapImages.getOceanCurrentArrow().clone();
    image.setRotation(rotation);
    image.setScale(0.65 + Math.min(0.5, velocity / 8));
    image.setColor(color);
    image.setRotateWithView(true);

    return new Style({
      image,
      text: new Text({
        text: `${(velocity / 1.852).toFixed(1)} kn`,
        offsetY: 28,
        font: '11px Roboto, Arial, sans-serif',
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
        stroke: new Stroke({ color: 'rgba(20, 60, 95, 0.9)', width: 3 })
      })
    });
  }

  private getFlowRotation(directionTo: number) {
    return (directionTo * Math.PI) / 180;
  }
}
