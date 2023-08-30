import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { SKRoute } from 'src/app/modules';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() routes: { [key: string]: any };
  @Input() routeStyles: { [key: string]: Style };
  @Input() activeRoute: string;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseRoutes(this.routes);
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key === 'routes') {
          this.parseRoutes(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'routeStyles') {
          // handle route styler change
        } else if (key === 'activeRoute') {
          this.parseRoutes(this.routes);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseRoutes(routes: { [key: string]: any } = this.routes) {
    const fa: Feature[] = [];
    for (const w in routes) {
      const c = fromLonLatArray(
        mapifyCoords(routes[w].feature.geometry.coordinates)
      );
      const f = new Feature({
        geometry: new LineString(c),
        name: routes[w].name
      });
      f.setId('route.' + w);
      f.setStyle(this.buildStyle(w, routes[w]));
      f.set(
        'pointMetadata',
        routes[w].feature.properties.coordinatesMeta ?? null
      );
      fa.push(f);
    }
    this.features = fa;
  }

  // build route style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStyle(id: string, rte: any): Style {
    if (typeof this.routeStyles !== 'undefined') {
      if (
        id === this.activeRoute &&
        typeof this.routeStyles.active !== 'undefined'
      ) {
        return this.routeStyles.active;
      } else if (rte.feature.properties.skType) {
        return this.routeStyles[rte.feature.properties.skType];
      } else {
        return this.routeStyles.default;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.layerProperties.style;
    } else {
      // default styles
      let s: Style;
      if (id === this.activeRoute) {
        s = new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 4
          })
        });
      } else {
        s = new Style({
          stroke: new Stroke({
            color: 'green',
            width: 2,
            lineDash: [20, 5, 5, 5]
          })
        });
      }
      return s;
    }
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardRouteLayerComponent extends RouteLayerComponent {
  @Input() routes: Array<[string, SKRoute, boolean]> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    super(changeDetectorRef, mapComponent);
  }

  parseRoutes(routes: Array<[string, SKRoute, boolean]> = this.routes) {
    const fa: Feature[] = [];
    for (const w of routes) {
      if (w[2]) {
        // selected
        const mc = mapifyCoords(w[1].feature.geometry.coordinates);
        const c = fromLonLatArray(mc);
        const f = new Feature({
          geometry: new LineString(c),
          name: w[1].name
        });
        f.setId('route.' + w[0]);
        f.setStyle(this.buildStyle(w[0], w[1]));
        f.set('pointMetadata', w[1].feature.properties.coordinatesMeta ?? null);
        fa.push(f);
      }
    }
    this.features = fa;
  }
}
