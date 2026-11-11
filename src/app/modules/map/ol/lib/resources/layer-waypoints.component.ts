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
import ImageState from 'ol/ImageState';
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
import { RouteEnd, joinOverlap, routeEndsAt } from './route-waypoint-overlap';

/**
 * Drawn in place of the icon at a route's start or end: invisible (OL still
 * hit-detects a transparent fill), so the waypoint stays clickable there.
 */
export const ROUTE_END_HIT_TARGET = new Circle({
  radius: 12,
  fill: new Fill({ color: 'rgba(0,0,0,0)' })
});
const iconHitTargets = new WeakMap<Icon, Circle>();

/**
 * An invisible circle covering the whole of `icon` wherever its anchor places
 * it, for an icon marking a route's start or end (a bundled flag, or a symbol
 * provider's override). Null until the icon's image has loaded and its size
 * is known, and for an image that loads with no size (some browsers report an
 * SVG without width/height as 0 x 0).
 */
export function iconHitTarget(icon: Icon): Circle | null {
  const cached = iconHitTargets.get(icon);
  if (cached) {
    return cached;
  }
  const size = icon.getSize();
  const anchor = icon.getAnchor();
  if (!size?.[0] || !size[1] || !anchor) {
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
  /** Route-end icons this layer is waiting on to size their hit targets. */
  private awaitedIcons?: WeakSet<Icon>;

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
   * starts or ends on it, so the route's start/end marker shows instead. It
   * keeps an invisible hit target over each such marker, so the waypoint stays
   * clickable all over it.
   */
  private styleAt(feature: Feature, resolution: number): Style | Style[] {
    const style = feature.get('baseStyle') as Style;
    const id = (feature.getId() as string).slice('waypoint.'.length);
    const pos = (feature.getGeometry() as Point).getCoordinates();
    const map = this.mapComponent.getMap();
    const ends = map ? routeEndsAt(map, id, pos, resolution) : [];
    if (!ends.length) {
      return style;
    }
    const markers = ends.map((end) => this.routeEndMarker(end));
    // A flag (or a provider icon) at the route end is as tall as a waypoint
    // icon, so the waypoint keeps its own label position above it.
    let text = style.getText() ?? undefined;
    if (markers.every((m) => !m.tall)) {
      text = text?.clone();
      text?.setOffsetY(ROUTE_END_LABEL_OFFSET_Y);
    }
    const targets = [...new Set(markers.map((m) => m.target))];
    return targets.map(
      (image, i) => new Style({ image, text: i === 0 ? text : undefined })
    );
  }

  /**
   * The hit target over the marker the route layer draws at route end `end`,
   * and whether that marker is tall. An icon (a bundled flag or a provider's
   * override) gets a circle sized to it; a drawn shape, the centred circle.
   */
  private routeEndMarker(end: RouteEnd): { target: Circle; tall: boolean } {
    const icon = this.mapImages.getRouteMarkerFor(
      end === 'start' ? ROUTE_MARKER_START : ROUTE_MARKER_END,
      this.routeStyle
    );
    if (!icon) {
      return { target: ROUTE_END_HIT_TARGET, tall: false };
    }
    const target = iconHitTarget(icon);
    if (!target) {
      this.restyleWhenLoaded(icon);
    }
    return { target: target ?? ROUTE_END_HIT_TARGET, tall: true };
  }

  /**
   * Re-style the layer once `icon`'s image has loaded, so its hit target can be
   * sized to it. Nothing else would: this layer never draws the icon itself,
   * and OL re-runs its style functions only when the source or view changes.
   */
  private restyleWhenLoaded(icon: Icon) {
    // An image that has already loaded (with no size) or failed won't change
    // again, so a listener on it would never be removed.
    const settled = [ImageState.LOADED, ImageState.ERROR];
    this.awaitedIcons ??= new WeakSet();
    if (this.awaitedIcons.has(icon) || settled.includes(icon.getImageState())) {
      return;
    }
    this.awaitedIcons.add(icon);
    const onChange = () => {
      const state = icon.getImageState();
      if (state === ImageState.LOADED || state === ImageState.ERROR) {
        icon.unlistenImageChange(onChange);
        if (state === ImageState.LOADED) {
          this.source?.changed();
        }
      }
    };
    icon.listenImageChange(onChange);
    icon.load();
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
