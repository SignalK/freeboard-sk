import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Text, Circle, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBWaypoints, Waypoints } from 'src/app/types';

@Component({
  selector: 'ol-map > sk-waypoints-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointsBaseComponent extends FBFeatureLayerComponent {
  @Input() waypointStyles: { [key: string]: Style };
  @Input() activeWaypoint: string;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['waypoint'];
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source) {
      if ('waypoints' in changes) {
        this.source.clear();
        this.parseWaypoints(changes['waypoints']);
      }
      if ('activeWaypoint' in changes) {
        this.source.clear();
        this.reloadWaypoints();
      }
    }
  }

  reloadWaypoints() {
    // overridable function
  }

  parseWaypoints(change: SimpleChange) {
    // overridable function
  }

  // build waypoint style
  buildStyle(id: string, wpt): Style {
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

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointLayerComponent extends WaypointsBaseComponent {
  @Input() waypoints: Waypoints;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseSKWaypoints(this.waypoints);
  }

  override reloadWaypoints() {
    this.parseSKWaypoints(this.waypoints);
  }

  override parseWaypoints(change: SimpleChange) {
    this.parseSKWaypoints(change.currentValue);
  }

  parseSKWaypoints(waypoints: Waypoints = this.waypoints) {
    const fa: Feature[] = [];
    for (const w in waypoints) {
      const f = new Feature({
        geometry: new Point(
          fromLonLat(waypoints[w].feature.geometry.coordinates)
        ),
        name: waypoints[w].name
      });
      f.setId('waypoint.' + w);
      f.setStyle(this.buildStyle(w, waypoints[w]).clone());
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardWaypointLayerComponent extends WaypointsBaseComponent {
  @Input() waypoints: FBWaypoints = [];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseFBWaypoints(this.waypoints);
  }

  override reloadWaypoints() {
    this.parseFBWaypoints(this.waypoints);
  }

  override parseWaypoints(change: SimpleChange) {
    this.parseFBWaypoints(change.currentValue);
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
        f.setStyle(this.buildStyle(w[0], w[1]).clone());
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
  }
}
