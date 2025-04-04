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
import { Geometry, MultiLineString, LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Vessel trail component **
@Component({
  selector: 'ol-map > fb-vessel-trail',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VesselTrailComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();

  @Input() localTrail: Array<Coordinate>;
  @Input() serverTrail: Array<Array<Coordinate>>;
  @Input() trailStyles: { [key: string]: Style };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  trailLocal: Feature;
  trailServer: Feature;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const fa = [];
    this.parseTrails();
    if (this.trailLocal) {
      fa.push(this.trailLocal);
    }
    if (this.trailServer) {
      fa.push(this.trailServer);
    }
    this.source = new VectorSource({ features: fa });
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
        if (key === 'localTrail') {
          if (this.source) {
            this.parseLocalTrail();
          }
        }
        if (key === 'serverTrail') {
          if (this.source) {
            this.parseServerTrail();
          }
        }
        if (key === 'trailStyles') {
          if (this.source) {
            this.parseTrails();
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

  parseTrails() {
    this.parseLocalTrail();
    this.parseServerTrail();
  }

  parseLocalTrail() {
    if (!this.localTrail) {
      return;
    }
    const c = fromLonLatArray(mapifyCoords(this.localTrail));
    if (!this.trailLocal) {
      // create feature
      this.trailLocal = new Feature(new LineString(c));
      this.trailLocal.setId('trail.self.local');
      this.trailLocal.setStyle(this.buildStyle('local'));
    } else {
      //update feature
      this.trailLocal = this.source.getFeatureById(
        'trail.self.local'
      ) as Feature;
      if (this.localTrail && Array.isArray(this.localTrail)) {
        const g: Geometry = this.trailLocal.getGeometry();
        (g as LineString).setCoordinates(c);
      }
    }
  }

  parseServerTrail() {
    if (!this.serverTrail) {
      return;
    }
    const ca = this.serverTrail.map((t: Array<Coordinate>) => {
      return fromLonLatArray(mapifyCoords(t));
    });
    if (!this.trailServer) {
      // create feature
      this.trailServer = new Feature(new MultiLineString(ca));
      this.trailServer.setId('trail.self.server');
      this.trailServer.setStyle(this.buildStyle('server'));
    } else {
      //update feature
      this.trailServer = this.source.getFeatureById(
        'trail.self.server'
      ) as Feature;
      if (this.serverTrail && Array.isArray(this.serverTrail)) {
        const g: Geometry = this.trailServer.getGeometry();
        (g as MultiLineString).setCoordinates(ca);
      }
    }
  }

  // build target style
  buildStyle(type = 'local'): Style {
    let cs: Style;
    if (type === 'server') {
      if (this.trailStyles && this.trailStyles.server) {
        cs = this.trailStyles.server;
      } else {
        cs = new Style({
          // default server
          stroke: new Stroke({
            color: 'rgb(252, 3, 132)',
            width: 1,
            lineDash: [4, 4]
          })
        });
      }
    } else {
      if (this.trailStyles && this.trailStyles.local) {
        cs = this.trailStyles.local;
      } else {
        cs = new Style({
          // default local
          stroke: new Stroke({
            color: 'rgb(252, 3, 132)',
            width: 1,
            lineDash: [2, 2]
          })
        });
      }
    }
    return cs;
  }
}
