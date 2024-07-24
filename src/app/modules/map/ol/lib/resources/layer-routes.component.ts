import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  SimpleChange
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { Geometry, LineString, Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { SKRoute } from 'src/app/modules';
import { LightTheme, DarkTheme } from '../themes';
import { getRhumbLineBearing } from 'geolib';
import { GeolibInputCoordinates } from 'geolib/es/types';
import { StyleLike } from 'ol/style/Style';

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
  protected theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() routes: { [key: string]: any };
  @Input() routeStyles: { [key: string]: Style };
  @Input() activeRoute: string;
  @Input() darkMode = false;
  @Input() labelMinZoom = 10;
  @Input() mapZoom = 10;
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
    this.theme = this.darkMode ? DarkTheme : LightTheme;
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

      if ('routes' in changes || 'activeRoute' in changes) {
        if ('routes' in changes) {
          this.parseRoutes(changes['routes'].currentValue);
        } else {
          this.parseRoutes(this.routes);
        }
        if (this.source) {
          this.source.clear();
          this.source.addFeatures(this.features);
          this.updateLabels();
        }
      }

      for (const key in changes) {
        if (key === 'labelMinZoom' || key === 'mapZoom' || key === 'darkMode') {
          if (key === 'darkMode') {
            this.theme = changes[key].currentValue ? DarkTheme : LightTheme;
          }
          this.handleLabelZoomChange(key, changes[key]);
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
      f.set(
        'pointMetadata',
        routes[w].feature.properties.coordinatesMeta ?? null
      );
      f.setStyle(this.styleFunction(f));
      fa.push(f);
    }
    this.features = fa;
  }

  // style function
  styleFunction(feature: Feature) {
    const geometry = feature.getGeometry() as LineString;
    const styles = [];
    const id = (feature.getId() as string).split('.').slice(-1)[0];
    const isActive = id === this.activeRoute;
    let ptFill: Fill;

    if (typeof this.routeStyles === 'undefined') {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        return styles;
      }
    }

    // line style
    if (isActive && typeof this.routeStyles.active !== 'undefined') {
      styles.push(this.routeStyles.active);
      ptFill = new Fill({
        color: this.routeStyles.active.getStroke().getColor()
      });
    } else {
      styles.push(this.routeStyles.default);
      ptFill = new Fill({
        color: this.routeStyles.default.getStroke().getColor()
      });
    }

    // point styles
    let idx = 0;
    const l = geometry.getCoordinates().length;
    geometry.forEachSegment((start, end) => {
      // start point
      if (idx === 0) {
        styles.push(
          new Style({
            geometry: new Point(start),
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 1,
                color: 'white'
              }),
              fill: ptFill
            })
          })
        );
      } else {
        if (isActive) {
          styles.push(
            new Style({
              geometry: new Point(start),
              image: new Circle({
                radius: 4,
                stroke: new Stroke({
                  width: 1,
                  color: 'white'
                }),
                fill: ptFill
              })
            })
          );
        } else {
          const d = getRhumbLineBearing(
            toLonLat(start) as GeolibInputCoordinates,
            toLonLat(end) as GeolibInputCoordinates
          );
          const rotation = (d * Math.PI) / 180;
          styles.push(
            new Style({
              geometry: new Point(start),
              image: new RegularShape({
                radius: 6,
                stroke: new Stroke({
                  width: 1,
                  color: 'white'
                }),
                fill: ptFill,
                points: 3,
                angle: 0,
                rotateWithView: true,
                rotation: rotation
              })
            })
          );
        }
      }
      // last point
      if (idx === l - 2) {
        styles.push(
          new Style({
            geometry: new Point(end),
            image: new RegularShape({
              radius: 6,
              stroke: new Stroke({
                width: 1,
                color: 'white'
              }),
              fill: ptFill,
              points: 4,
              angle: Math.PI / 4
            })
          })
        );
      }
      idx++;
    });
    return styles;
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key === 'labelMinZoom') {
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabels();
      }
    } else if (key === 'mapZoom') {
      if (typeof this.labelMinZoom !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom &&
            change.previousValue < this.labelMinZoom) ||
          (change.currentValue < this.labelMinZoom &&
            change.previousValue >= this.labelMinZoom)
        ) {
          this.updateLabels();
        }
      }
    } else if (key === 'darkMode') {
      this.updateLabels();
    }
  }

  // update feature labels
  updateLabels() {
    const showLabels = Math.abs(this.mapZoom) >= this.labelMinZoom;
    this.source.getFeatures().forEach((f: Feature) => {
      const s: StyleLike = f.getStyle();
      if (Array.isArray(s)) {
        // route label
        const cs = s[0].clone();
        cs.getText()?.setText(showLabels ? f.get('name') : '');
        cs.getText()?.setFill(new Fill({ color: this.theme.labelText.color }));
        s[0] = cs;
      }
      f.setStyle(s);
    });
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
        f.set('pointMetadata', w[1].feature.properties.coordinatesMeta ?? null);
        f.setStyle(this.styleFunction(f));
        fa.push(f);
      }
    }
    this.features = fa;
  }
}
