import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Text, Circle, Fill, Icon, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBWaypoints, RouteStyle } from 'src/app/types';
import { SKWaypoint } from 'src/app/modules/skresources';
import {
  MapImageRegistry,
  ROUTE_MARKER_END,
  ROUTE_MARKER_START
} from '../map-image-registry.service';
import { isRouteEndAt, joinOverlap } from './route-waypoint-overlap';

/**
 * Drawn in place of the icon at a route's start or end: invisible (OL still
 * hit-detects a transparent fill), so the waypoint stays clickable there.
 */
export const ROUTE_END_HIT_TARGET = new Circle({
  radius: 12,
  fill: new Fill({ color: 'rgba(0,0,0,0)' })
});
/**
 * The hit target over a route start/end flag, which stands up and to the right
 * of the point (anchored at the foot of its pole), so it is clickable all over.
 */
export const ROUTE_FLAG_HIT_TARGET = new Circle({
  radius: 13,
  displacement: [7, 12],
  fill: new Fill({ color: 'rgba(0,0,0,0)' })
});
const iconHitTargets = new WeakMap<Icon, Circle>();

/**
 * An invisible circle covering the whole of `icon` wherever its anchor places
 * it, for a symbol provider's route start/end marker. Null until the icon's
 * image has loaded and its size is known.
 */
export function iconHitTarget(icon: Icon): Circle | null {
  const cached = iconHitTargets.get(icon);
  if (cached) {
    return cached;
  }
  const size = icon.getSize();
  const anchor = icon.getAnchor();
  if (!size || !anchor) {
    return null;
  }
  const [sx, sy] = icon.getScaleArray();
  const w = size[0] * sx;
  const h = size[1] * sy;
  // the icon's centre relative to the point, in screen pixels (y down)
  const cx = w / 2 - anchor[0] * sx;
  const cy = h / 2 - anchor[1] * sy;
  const target = new Circle({
    radius: Math.hypot(w, h) / 2,
    displacement: [cx, -cy],
    fill: new Fill({ color: 'rgba(0,0,0,0)' })
  });
  iconHitTargets.set(icon, target);
  return target;
}
/** Label offset sized to a drawn route start/end shape rather than an icon. */
const ROUTE_END_LABEL_OFFSET_Y = -12;

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardWaypointLayerComponent extends FBFeatureLayerComponent {
  @Input() waypointStyles?: { [key: string]: Style };
  @Input() activeWaypoint?: string | null;
  @Input() waypoints: FBWaypoints = [];
  @Input() routeStyle: RouteStyle = 'flags';

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
    this.labelPrefixes = ['waypoint'];
    const map = this.mapComponent.getMap();
    if (map && this.source) {
      this.leaveOverlap = joinOverlap(map, 'waypoints', this.source);
    }
    this.parseFBWaypoints(this.waypoints);
  }

  override ngOnDestroy() {
    this.leaveOverlap?.();
    super.ngOnDestroy();
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source) {
      if ('waypoints' in changes) {
        this.source.clear();
        this.parseFBWaypoints(changes['waypoints'].currentValue);
      }
      if ('activeWaypoint' in changes) {
        this.source.clear();
        this.reloadWaypoints();
      }
      if ('routeStyle' in changes) {
        this.source.changed();
      }
    }
  }

  /**
   * The waypoint's style at `resolution`: without its icon where a drawn route
   * starts or ends on it, so the route's start/end marker shows instead.
   */
  private styleAt(feature: Feature, resolution: number): Style {
    const style = feature.get('baseStyle') as Style;
    const id = (feature.getId() as string).slice('waypoint.'.length);
    const pos = (feature.getGeometry() as Point).getCoordinates();
    const map = this.mapComponent.getMap();
    if (!map || !isRouteEndAt(map, id, pos, resolution)) {
      return style;
    }
    // A flag (or a provider icon) at the route end is as tall as a waypoint
    // icon, so the waypoint keeps its own label position above it.
    const provided =
      this.mapImages.getExternalSymbol(ROUTE_MARKER_START) ??
      this.mapImages.getExternalSymbol(ROUTE_MARKER_END);
    if (provided || this.routeStyle === 'flags') {
      const target = provided
        ? (iconHitTarget(provided) ?? ROUTE_END_HIT_TARGET)
        : ROUTE_FLAG_HIT_TARGET;
      return new Style({ image: target, text: style.getText() ?? undefined });
    }
    const text = style.getText()?.clone();
    text?.setOffsetY(ROUTE_END_LABEL_OFFSET_Y);
    return new Style({ image: ROUTE_END_HIT_TARGET, text });
  }

  /** Labels live on each feature's base style; its style is a function. */
  override updateLabels() {
    if (!this.source) {
      return;
    }
    for (const f of this.source.getFeatures()) {
      this.setTextLabel(f.get('baseStyle'), f.get('name'));
    }
    this.source.changed();
  }

  reloadWaypoints() {
    this.parseFBWaypoints(this.waypoints);
  }

  parseFBWaypoints(waypoints: FBWaypoints = this.waypoints) {
    const fa: Feature[] = [];
    for (const w of waypoints) {
      if (w[2]) {
        // selected
        const f = new Feature({
          geometry: new Point(fromLonLat(w[1].feature.geometry.coordinates)),
          name: w[1].name
        });
        f.setId('waypoint.' + w[0]);
        f.set('baseStyle', this.buildStyle(w[0], w[1]).clone());
        f.setStyle((feat, resolution) =>
          this.styleAt(feat as Feature, resolution)
        );
        fa.push(f);
      }
    }
    this.source?.addFeatures(fa);
  }

  // build waypoint style
  buildStyle(id: string, wpt: SKWaypoint): Style {
    const icon = this.mapImages.getWaypoint(
      wpt.type || 'waypoint',
      wpt.feature.properties?.skIcon
    );
    if (icon && typeof this.waypointStyles === 'undefined') {
      const s = new Style({
        image: icon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: -28
        })
      });
      return this.setTextLabel(s, wpt.name);
    }

    if (typeof this.waypointStyles !== 'undefined') {
      if (
        id === this.activeWaypoint &&
        typeof this.waypointStyles.active !== 'undefined'
      ) {
        return this.setTextLabel(this.waypointStyles.active, wpt.name);
      } else if (wpt.type && this.waypointStyles[wpt.type.toLowerCase()]) {
        return this.setTextLabel(
          this.waypointStyles[wpt.type.toLowerCase()],
          wpt.name
        );
      } else {
        return this.setTextLabel(this.waypointStyles.default, wpt.name);
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.setTextLabel(this.layerProperties.style, wpt.name);
    } else {
      // default styles
      let s: Style;
      if (id === this.activeWaypoint) {
        s = new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'blue' }),
            stroke: new Stroke({
              color: 'black',
              width: 2
            })
          }),
          text: new Text({
            text: '',
            offsetY: -12
          })
        });
      } else {
        s = new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'gold' }),
            stroke: new Stroke({
              color: 'black',
              width: 2
            })
          }),
          text: new Text({
            text: '',
            offsetY: -12
          })
        });
      }
      return this.setTextLabel(s, wpt.name);
    }
  }
}
