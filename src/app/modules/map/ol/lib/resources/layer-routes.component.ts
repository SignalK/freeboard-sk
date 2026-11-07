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
import { asString } from 'ol/color';
import type { Coordinate } from 'ol/coordinate';
import { toLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { getRhumbLineBearing, GeolibInputCoordinates } from 'geolib';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBRoutes, RouteStyle } from 'src/app/types';
import {
  MapImageRegistry,
  ROUTE_MARKER_END,
  ROUTE_MARKER_START,
  ROUTE_MARKER_WAYPOINT
} from '../map-image-registry.service';
import {
  drawnTogether,
  drawnWaypointPosition,
  joinOverlap,
  linkedWaypointId,
  PointLink
} from './route-waypoint-overlap';
import { drawRouteFlow, flowPhase } from './route-flow';

/** Redraw interval of the animated direction chevrons: ~12 fps keeps a Pi cool. */
const FLOW_FRAME_MS = 80;

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRouteLayerComponent extends FBFeatureLayerComponent {
  @Input() routeStyles?: { [key: string]: Style };
  @Input() activeRoute?: string | null;
  @Input() routes: FBRoutes = [];
  @Input() routeStyle: RouteStyle = 'flags';
  /** The active route is followed from its last point to its first. */
  @Input() activeReversed = false;
  /** Move the direction chevrons along the routes. */
  @Input() animateFlow = false;

  private leaveOverlap?: () => void;
  private flowTimer?: ReturnType<typeof setInterval>;

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
    const map = this.mapComponent.getMap();
    if (map && this.source) {
      this.leaveOverlap = joinOverlap(map, 'routes', this.source);
    }
    this.parseFBRoutes(this.routes);
    this.syncFlowTimer();
  }

  override ngOnDestroy() {
    this.stopFlowTimer();
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
    } else if (
      this.source &&
      ('routeStyle' in changes || 'activeReversed' in changes)
    ) {
      this.source.changed();
    }
    if (this.source && ('routes' in changes || 'animateFlow' in changes)) {
      this.syncFlowTimer();
    }
  }

  /** Runs the redraw timer only while there is a route to animate. */
  private syncFlowTimer() {
    const wanted = this.animateFlow && this.routes.some((r) => r[2]);
    if (!wanted) {
      this.stopFlowTimer();
      this.mapComponent.getMap()?.render();
    } else if (!this.flowTimer) {
      this.flowTimer = setInterval(() => {
        if (!document.hidden) {
          this.mapComponent.getMap()?.render();
        }
      }, FLOW_FRAME_MS);
    }
  }

  private stopFlowTimer() {
    if (this.flowTimer) {
      clearInterval(this.flowTimer);
      this.flowTimer = undefined;
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
    const map = this.mapComponent.getMap();
    const wpt = map
      ? drawnWaypointPosition(map, linkedWaypointId(meta?.[index]))
      : undefined;
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
    this.source?.addFeatures(fa);
    this.updateLabels();
  }

  // Route style function
  buildStyle(feature: Feature, resolution: number) {
    const geometry = feature.getGeometry() as LineString;
    const styles = [];
    const id = (feature.getId() as string).split('.').slice(-1)[0];
    const isActive = id === this.activeRoute;

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
    const lineStyle =
      isActive && typeof this.routeStyles.active !== 'undefined'
        ? this.routeStyles.active
        : this.routeStyles.default.clone();
    styles.push(lineStyle);
    const lineColor = lineStyle.getStroke()?.getColor();
    const ptFill = new Fill({ color: lineColor });

    // direction of travel: guide lines either side and chevrons along it
    const flowColor = Array.isArray(lineColor)
      ? asString(lineColor)
      : typeof lineColor === 'string'
        ? lineColor
        : 'green';
    const reverse = isActive && this.activeReversed;
    const animate = this.animateFlow;
    styles.push(
      new Style({
        renderer: (pixelCoords, state) =>
          drawRouteFlow(
            state.context,
            pixelCoords as Coordinate[],
            state.pixelRatio,
            {
              color: flowColor,
              reverse,
              phase: flowPhase(animate, performance.now())
            }
          )
      })
    );

    // A symbol-provider override wins in either style. 'flags' falls back to
    // the bundled flag and pin glyphs; 'classic' (marker null) falls back to the
    // shapes drawn below in the route line's colour, which an icon cannot take.
    // The waypoint marker is cloned per segment and rotated to the bearing;
    // start/end markers render upright.
    const marker = (id: string) =>
      this.mapImages.getRouteMarkerFor(id, this.routeStyle);
    const startSym = marker(ROUTE_MARKER_START);
    const wptSym = marker(ROUTE_MARKER_WAYPOINT);
    const endSym = marker(ROUTE_MARKER_END);

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
        } else {
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
