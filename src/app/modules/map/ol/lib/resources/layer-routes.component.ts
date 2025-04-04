import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
  SimpleChange
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { Geometry, LineString, Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { getRhumbLineBearing } from 'geolib';
import { GeolibInputCoordinates } from 'geolib/es/types';
import { StyleLike } from 'ol/style/Style';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBRoutes, Routes } from 'src/app/types';

@Component({
  selector: 'ol-map > sk-routes-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RoutesBaseComponent extends FBFeatureLayerComponent {
  @Input() routeStyles: { [key: string]: Style };
  @Input() activeRoute: string;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['route'];
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && ('routes' in changes || 'activeRoute' in changes)) {
      this.source.clear();
      if ('routes' in changes) {
        this.parseRoutes(changes['routes']);
      } else if ('activeRoute' in changes) {
        this.onActivateRoute();
      }
    }
  }

  onActivateRoute() {
    // overridable function
  }

  parseRoutes(change: SimpleChange) {
    // overridable function
  }

  // Route style function
  buildStyle(feature: Feature) {
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
      styles.push(this.routeStyles.default.clone());
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
}

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RouteLayerComponent extends RoutesBaseComponent {
  @Input() routes: Routes;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseSKRoutes(this.routes);
  }

  override parseRoutes(change: SimpleChange) {
    this.parseSKRoutes(change.currentValue);
  }

  override onActivateRoute() {
    this.parseSKRoutes(this.routes);
  }

  parseSKRoutes(routes: Routes = this.routes) {
    const fa: Feature[] = [];
    for (const r in routes) {
      const c = fromLonLatArray(
        mapifyCoords(routes[r].feature.geometry.coordinates)
      );
      const f = new Feature({
        geometry: new LineString(c),
        name: routes[r].name
      });
      f.setId('route.' + r);
      f.set(
        'pointMetadata',
        routes[r].feature.properties.coordinatesMeta ?? null
      );
      f.setStyle(this.buildStyle(f));
      fa.push(f);
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRouteLayerComponent extends RoutesBaseComponent {
  @Input() routes: FBRoutes = [];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseFBRoutes(this.routes);
  }

  override parseRoutes(change: SimpleChange) {
    this.parseFBRoutes(change.currentValue);
  }

  override onActivateRoute() {
    this.parseFBRoutes(this.routes);
  }

  parseFBRoutes(routes: FBRoutes = this.routes) {
    const fa: Feature[] = [];
    for (const r of routes) {
      if (r[2]) {
        // selected
        const mc = mapifyCoords(r[1].feature.geometry.coordinates);
        const c = fromLonLatArray(mc);
        const f = new Feature({
          geometry: new LineString(c),
          name: r[1].name
        });
        f.setId('route.' + r[0]);
        f.set('pointMetadata', r[1].feature.properties.coordinatesMeta ?? null);
        f.setStyle(this.buildStyle(f));
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }
}
