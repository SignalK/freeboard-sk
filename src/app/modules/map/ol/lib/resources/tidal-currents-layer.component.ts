import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style, Text } from 'ol/style';
import {
  Subject,
  Subscription,
  auditTime,
  catchError,
  of,
  switchMap,
  tap
} from 'rxjs';
import { FeatureLike } from 'ol/Feature';
import { fromLonLat, transformExtent } from 'ol/proj';

import {
  TidalCurrentsService,
  TidalCurrentGridResponse
} from '../tidal-currents.service';
import { MapComponent } from '../map.component';
import { MapImageRegistry } from '../map-image-registry.service';
import { AppFacade } from 'src/app/app.facade';

@Component({
  selector: 'ol-map > fb-tidal-currents',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class TidalCurrentsLayerComponent implements OnChanges, OnDestroy {
  @Input() show = false;
  @Input() opacity = 0.7;

  private layer: VectorLayer<VectorSource>;
  private source: VectorSource;
  private refresh$ = new Subject<void>();
  private refreshSub: Subscription;
  private readonly destroyRef = inject(DestroyRef);
  private readonly zIndex = 50;

  constructor(
    private mapComponent: MapComponent,
    private currents: TidalCurrentsService,
    private app: AppFacade,
    private mapImages: MapImageRegistry,
    changeDetectorRef: ChangeDetectorRef
  ) {
    changeDetectorRef.detach();
    effect(() => {
      this.currents.scrubTime();
      if (this.show && this.layer) {
        this.refresh$.next();
      }
    });
    this.currents.dragEnd$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.show && this.layer) this.refresh$.next();
      });
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
      visible: this.show,
      style: (feature) => this.currentsStyleFunction(feature)
    });
    this.layer.set('id', 'tidal-currents');
    this.mapComponent.getMap().addLayer(this.layer);

    this.refreshSub = this.refresh$
      .pipe(
        auditTime(300),
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
      return of<TidalCurrentGridResponse | null>(null);
    }

    const bbox = this.getBbox();
    if (!bbox) {
      return of<TidalCurrentGridResponse | null>(null);
    }

    return this.currents
      .getGridCurrents(bbox, this.currents.selectedTime())
      .pipe(
        tap((response) => this.renderCurrents(response.points)),
        catchError(() => {
          console.warn('Failed to fetch tidal currents');
          return of<TidalCurrentGridResponse | null>(null);
        })
      );
  }

  private getBbox(): [number, number, number, number] | null {
    const map = this.mapComponent.getMap();
    const size = map.getSize();
    if (!size) {
      return null;
    }

    const extent = transformExtent(
      map.getView().calculateExtent(size),
      'EPSG:3857',
      'EPSG:4326'
    );
    return [extent[0], extent[1], extent[2], extent[3]] as [
      number,
      number,
      number,
      number
    ];
  }

  private renderCurrents(points: TidalCurrentGridResponse['points']) {
    if (!this.source) {
      return;
    }
    this.source.clear();
    const features = points.map((point, index) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.longitude, point.latitude])),
        driftKts: point.speedKn,
        setDeg: point.direction
      });
      feature.setId('tidal.' + index);
      const speedLabel = this.currents.formatSpeed(point.speedKn);
      const dirLabel = this.app.formatValueForDisplay(point.direction, 'deg', {
        precision: 0
      });
      feature.set('name', `Current: ${speedLabel} @ ${dirLabel}T`);
      return feature;
    });
    this.source.addFeatures(features);
  }

  private currentsStyleFunction(feature: FeatureLike) {
    const driftKts = Number(feature.get('driftKts')) || 0;
    const setDeg = Number(feature.get('setDeg')) || 0;
    const setRad = (setDeg * Math.PI) / 180;

    // Traffic-light severity by drift; applied as an icon tint so a provider
    // override is coloured the same way (the bundled arrow has a neutral fill).
    let color = '#28a745';
    if (driftKts >= 2.0) {
      color = '#dc3545';
    } else if (driftKts >= 1.0) {
      color = '#ffc107';
    }

    const pixelSize = Math.max(16, Math.min(40, 12 + driftKts * 9));
    const speedLabel = this.currents.formatSpeed(driftKts);

    const image = this.mapImages.getTidalCurrentArrow().clone();
    image.setRotation(setRad);
    image.setScale(pixelSize / 24);
    image.setColor(color);
    image.setRotateWithView(true);

    return new Style({
      image,
      text: new Text({
        text: speedLabel,
        offsetY: 14,
        font: '11px Roboto, Arial, sans-serif',
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
        stroke: new Stroke({ color: 'rgba(20, 60, 95, 0.9)', width: 3 })
      })
    });
  }
}
