import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { getRhumbLineBearing, GeolibInputCoordinates } from 'geolib';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBRoutes } from 'src/app/types';
import { MapImageRegistry } from '../map-image-registry.service';
import {
  drawnTogether,
  drawnWaypointPosition,
  joinOverlap,
  linkedWaypointId,
  PointLink
} from './route-waypoint-overlap';

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
  @Input() routeStyles?: { [key: string]: Style };
  @Input() activeRoute?: string;
  @Input() routes: FBRoutes = [];

  private leaveOverlap?: () => void;

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
    this.leaveOverlap = joinOverlap(
      this.mapComponent.getMap(),
      'routes',
      this.source
    );
    this.parseFBRoutes(this.routes);
  }

  override ngOnDestroy() {
    this.leaveOverlap?.();
    super.ngOnDestroy();
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

  /**
   * True when route point `index` links to a waypoint that is drawn on top of
   * it. The position test (not just the link) keeps the marker when the
   * waypoint has moved since the route was built, when a vertex is dragged off
   * it, and while a Modify drag has inserted a vertex the metadata does not
   * reflect yet.
   */
  private isCoveredByWaypoint(
    meta: PointLink[] | null,
    index: number,
    coord: number[],
    resolution: number
  ): boolean {
    const wpt = drawnWaypointPosition(
      this.mapComponent.getMap(),
      linkedWaypointId(meta?.[index])
    );
    return !!wpt && drawnTogether(coord, wpt, resolution);
  }

  onActivateRoute() {
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
        f.set(
          'pointMetadata',
          r[1].feature.properties?.coordinatesMeta ?? null
        );
        // Style FUNCTION (not a static array) so the per-vertex markers, whose
        // geometries are derived from the line in buildStyle, re-evaluate as the
        // geometry changes during a Modify drag — otherwise they stay frozen at
        // the original vertex positions until the edit finishes.
        f.setStyle((feat, resolution) =>
          this.buildStyle(feat as Feature, resolution)
        );
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }

  // Route style function
  buildStyle(feature: Feature, resolution: number) {
    const geometry = feature.getGeometry() as LineString;
    const styles = [];
    const id = (feature.getId() as string).split('.').slice(-1)[0];
    const isActive = id === this.activeRoute;
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
        color: this.routeStyles.active.getStroke()?.getColor()
      });
    } else {
      styles.push(this.routeStyles.default.clone());
      ptFill = new Fill({
        color: this.routeStyles.default.getStroke()?.getColor()
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

    // point styles
    const meta = feature.get('pointMetadata') as PointLink[] | null;
    let idx = 0;
    const l = geometry.getCoordinates().length;
    geometry.forEachSegment((start, end) => {
      if (idx === 0) {
        // start point
        styles.push(
          new Style({
            geometry: new Point(start),
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
      } else if (!this.isCoveredByWaypoint(meta, idx, start, resolution)) {
        // An intermediate point a waypoint icon covers gets no marker. Start
        // and end markers are always drawn; the waypoint layer gives way there.
        if (wptSym) {
          // Clone the cached icon so each segment can carry its own bearing
          // rotation without mutating the shared instance.
          const d = getRhumbLineBearing(
            toLonLat(start) as GeolibInputCoordinates,
            toLonLat(end) as GeolibInputCoordinates
          );
          const img = wptSym.clone();
          img.setRotation((d * Math.PI) / 180);
          img.setRotateWithView(true);
          styles.push(
            new Style({
              geometry: new Point(start),
              image: img
            })
          );
        } else if (isActive) {
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
      }
      idx++;
    });
    return styles;
  }
}
