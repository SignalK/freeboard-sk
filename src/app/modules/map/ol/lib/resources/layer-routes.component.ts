import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { MultiLineString, Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Coordinate } from '../models';
import { fromLonLatArray, splitAtAntimeridian } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBRoutes } from 'src/app/types';
import { MapImageRegistry } from '../map-image-registry.service';

/** Symbol ids used to override the default route marker shapes. */
export const ROUTE_MARKER_START = 'route-start';
export const ROUTE_MARKER_WAYPOINT = 'route-waypoint';
export const ROUTE_MARKER_END = 'route-end';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRouteLayerComponent extends FBFeatureLayerComponent {
  @Input() routeStyles: { [key: string]: Style };
  @Input() activeRoute: string;
  @Input() routes: FBRoutes = [];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['route'];
    this.parseFBRoutes(this.routes);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && ('routes' in changes || 'activeRoute' in changes)) {
      this.source.clear();
      if ('routes' in changes) {
        this.parseFBRoutes(changes['routes'].currentValue);
      } else if ('activeRoute' in changes) {
        this.onActivateRoute();
      }
    }
  }

  onActivateRoute() {
    this.parseFBRoutes(this.routes);
  }

  parseFBRoutes(routes: FBRoutes = this.routes) {
    const fa: Feature[] = [];
    for (const r of routes) {
      if (r[2]) {
        // selected
        const rawCoords = r[1].feature.geometry.coordinates;
        // Split at antimeridian: each segment stays within [-180, 180] so
        // OL wrapX can clone every segment into all adjacent world copies.
        const multiCoords = splitAtAntimeridian(rawCoords).map(
          (seg) => fromLonLatArray(seg) as Coordinate[]
        );
        const f = new Feature({
          geometry: new MultiLineString(multiCoords),
          name: r[1].name
        });
        f.setId('route.' + r[0]);
        f.set('pointMetadata', r[1].feature.properties.coordinatesMeta ?? null);
        // Store waypoint Mercator coordinates separately so buildStyle can place
        // markers on actual waypoints without having to filter out the
        // interpolated ±180° split endpoints from the MultiLineString.
        f.set('waypointMercCoords', fromLonLatArray(rawCoords) as Coordinate[]);
        // Style FUNCTION (not a static array) so the per-vertex markers,
        // whose geometries are derived from waypointMercCoords, re-evaluate
        // as the geometry changes during a Modify drag.
        f.setStyle((feat) => this.buildStyle(feat as Feature));
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }

  /**
   * Update the rendered LineString geometry after a vertex drag.
   * Called from fb-map after each onModifyEnd while editing a route.
   * @param routeId   The bare route UUID (without the 'route.' prefix)
   * @param newCoords New waypoint coordinates in lon/lat (EPSG:4326)
   */
  updateRouteSegments(routeId: string, newCoords: Coordinate[]) {
    const f = this.source.getFeatureById('route.' + routeId) as Feature;
    if (f) {
      const multiCoords = splitAtAntimeridian(newCoords).map(
        (seg) => fromLonLatArray(seg) as Coordinate[]
      );
      (f.getGeometry() as MultiLineString).setCoordinates(multiCoords);
      f.set('waypointMercCoords', fromLonLatArray(newCoords) as Coordinate[]);
      f.setStyle(this.buildStyle(f));
    }
  }

  // Route style function
  buildStyle(feature: Feature) {
    const styles = [];
    const isActive =
      (feature.getId() as string).split('.')[1] === this.activeRoute;
    let ptFill: Fill;

    if (typeof this.routeStyles === 'undefined') {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        styles.push(
          new Style({
            stroke: new Stroke({
              color: 'green',
              width: 2
            })
          })
        );
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

    // External symbol overrides (null when no provider symbol is registered).
    // When present, an external symbol replaces the default drawn shape.
    // Note: external symbols do not inherit the route line colour. The waypoint
    // symbol is cloned per-segment and rotated to the bearing; start/end symbols
    // render upright.
    const startSym = this.mapImages.getExternalSymbol(ROUTE_MARKER_START);
    const wptSym = this.mapImages.getExternalSymbol(ROUTE_MARKER_WAYPOINT);
    const endSym = this.mapImages.getExternalSymbol(ROUTE_MARKER_END);

    // Waypoint Mercator coordinates are stored on the feature at creation/update
    // time. They correspond to the actual route waypoints in the primary world
    // ([-180°, 180°] → [-20037508, 20037508] m), so OL's wrapX mechanism
    // correctly clones the resulting Point markers into every world copy.
    const waypoints: Coordinate[] = feature.get('waypointMercCoords') ?? [];
    const worldWidth = 2 * 20037508.3427892;

    const l = waypoints.length;
    for (let idx = 0; idx < l; idx++) {
      const c = waypoints[idx];
      if (idx === 0) {
        // start point
        styles.push(
          new Style({
            geometry: new Point(c),
            image:
              startSym ??
              new Circle({
                radius: 5,
                stroke: new Stroke({
                  width: 1,
                  color: 'white'
                }),
                fill: ptFill
              })
          })
        );
      } else if (idx === l - 1) {
        // end point
        styles.push(
          new Style({
            geometry: new Point(c),
            image:
              endSym ??
              new RegularShape({
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
      } else if (wptSym) {
        // intermediate waypoint: external symbol, rotated to bearing.
        // Use Mercator dx/dy so the arrow wraps correctly at the antimeridian.
        const prev = waypoints[idx - 1];
        let dx = c[0] - prev[0];
        if (dx > worldWidth / 2) dx -= worldWidth;
        else if (dx < -worldWidth / 2) dx += worldWidth;
        const rotation = Math.atan2(dx, c[1] - prev[1]);
        const img = wptSym.clone();
        img.setRotation(rotation);
        img.setRotateWithView(true);
        styles.push(
          new Style({
            geometry: new Point(c),
            image: img
          })
        );
      } else if (isActive) {
        // intermediate waypoint (active route)
        styles.push(
          new Style({
            geometry: new Point(c),
            image: new Circle({
              radius: 4,
              stroke: new Stroke({ width: 1, color: 'white' }),
              fill: ptFill
            })
          })
        );
      } else {
        // intermediate waypoint (inactive): arrow pointing towards next waypoint.
        // Compute bearing in Mercator space; detect antimeridian crossings by
        // checking if |dx| > half a world width, and wrap accordingly so the
        // arrow points in the correct direction of travel.
        const prev = waypoints[idx - 1];
        let dx = c[0] - prev[0];
        if (dx > worldWidth / 2) dx -= worldWidth;
        else if (dx < -worldWidth / 2) dx += worldWidth;
        const rotation = Math.atan2(dx, c[1] - prev[1]);
        styles.push(
          new Style({
            geometry: new Point(c),
            image: new RegularShape({
              radius: 6,
              stroke: new Stroke({ width: 1, color: 'white' }),
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
    return styles;
  }
}
