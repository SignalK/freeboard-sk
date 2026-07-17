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
  distinctUntilChanged,
  map as rxMap,
  of,
  switchMap,
  tap
} from 'rxjs';
import { FeatureLike } from 'ol/Feature';
import { fromLonLat, toLonLat } from 'ol/proj';

import {
  WeatherService,
  OceanCurrentSample
} from 'src/app/modules/weather/weather.service';
import { MapComponent } from '../map.component';
import { MapImageRegistry } from '../map-image-registry.service';

export interface CurrentSamplePoint {
  latitude: number;
  longitude: number;
}

// Web Mercator is undefined beyond ~±85.06°; drop grid points past it.
const MAX_MERCATOR_LATITUDE = 85;

/**
 * Build the sample grid for a projected (EPSG:3857) viewport extent, snapped to
 * a stable lattice: at a given zoom the extent's span is invariant to panning,
 * so a fixed cell size with a snapped origin means panning by less than one cell
 * yields the *identical* point set. Snapping in projected space (not lon/lat) is
 * deliberate — Mercator distorts the latitude span, so an equivalent lon/lat
 * lattice would shift on every north/south pan and defeat de-duplication. Points
 * are returned in lon/lat with wrapped longitudes normalised to [-180, 180], so
 * repeated/small moves de-duplicate to the same request (issue #522).
 */
export function buildCurrentSampleGrid(
  extent: number[],
  columns: number,
  rows: number,
  project: (coordinate: number[]) => number[] = toLonLat
): CurrentSamplePoint[] {
  const [minX, minY, maxX, maxY] = extent;
  const cellWidth = (maxX - minX) / columns;
  const cellHeight = (maxY - minY) / rows;
  if (!(cellWidth > 0) || !(cellHeight > 0)) {
    return [];
  }

  const originX = Math.floor(minX / cellWidth) * cellWidth;
  const originY = Math.floor(minY / cellHeight) * cellHeight;
  const round = (n: number) => Number(n.toFixed(4));
  const points: CurrentSamplePoint[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const [lon, lat] = project([
        originX + (col + 0.5) * cellWidth,
        originY + (row + 0.5) * cellHeight
      ]);
      if (lat < -MAX_MERCATOR_LATITUDE || lat > MAX_MERCATOR_LATITUDE) {
        continue;
      }
      const longitude = ((((lon + 180) % 360) + 360) % 360) - 180;
      points.push({ latitude: round(lat), longitude: round(longitude) });
    }
  }
  return points;
}

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
        debounceTime(600),
        rxMap(() => this.getSamplePoints()),
        distinctUntilChanged((a, b) => this.pointsKey(a) === this.pointsKey(b)),
        switchMap((points) => this.fetchCurrents(points))
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

  private fetchCurrents(points: CurrentSamplePoint[]) {
    if (!this.show || !this.source || points.length === 0) {
      return of<OceanCurrentSample[]>([]);
    }

    return this.weather.getOceanCurrentSamples(points).pipe(
      tap((samples) => this.renderCurrents(samples)),
      catchError(() => of<OceanCurrentSample[]>([]))
    );
  }

  private getSamplePoints(): CurrentSamplePoint[] {
    const map = this.mapComponent.getMap();
    const size = map.getSize();
    if (!size) {
      return [];
    }

    // Projected (EPSG:3857) extent — its span is pan-invariant at a given zoom,
    // which is what makes the snapped lattice stable (see buildCurrentSampleGrid).
    return buildCurrentSampleGrid(
      map.getView().calculateExtent(size),
      this.gridColumns,
      this.gridRows
    );
  }

  private pointsKey(points: CurrentSamplePoint[]) {
    return points.map((p) => `${p.latitude},${p.longitude}`).join(';');
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
