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
import { Style, RegularShape, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { AsyncSubject } from 'rxjs';

// ** Signal K targets  **
@Component({
  selector: 'ol-map > sk-targets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SKTargetsLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() targets: Map<string, any> = new Map();
  @Input() targetStyles: { [key: string]: Style };
  @Input() targetType: string;
  @Input() inactiveTime = 180000; // in ms (3 mins)
  @Input() labelMinZoom = 10;
  @Input() mapZoom = 10;
  @Input() updateIds: Array<string> = [];
  @Input() staleIds: Array<string> = [];
  @Input() removeIds: Array<string> = [];
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource();
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );
    this.parseItems(this.extractKeys(this.targets));

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
      const properties: { [index: string]: any } = {};
      for (const key in changes) {
        if (key == 'targets' && changes[key].firstChange) {
          if (!changes[key].currentValue) {
            return;
          }
          if (!this.source) {
            return;
          }
          this.source.clear();
          this.parseItems(this.extractKeys(changes[key].currentValue));
        } else if (key == 'updateIds') {
          this.parseItems(changes[key].currentValue);
        } else if (key == 'staleIds') {
          this.parseItems(changes[key].currentValue, true);
        } else if (key == 'removeIds') {
          this.removeItems(changes[key].currentValue);
        } else if (key == 'inactiveTime') {
          this.parseItems(Object.keys(this.targets));
        } else if (key == 'targetStyles' && !changes[key].firstChange) {
          this.parseItems(Object.keys(this.targets));
        } else if (key == 'labelMinZoom' || key == 'mapZoom') {
          this.handleLabelZoomChange(key, changes[key]);
        } else if (key == 'layerProperties') {
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

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key == 'labelMinZoom') {
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabels();
      }
    } else if (key == 'mapZoom') {
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
    }
  }

  extractKeys(m: Map<string, any>): Array<string> {
    const keys = [];
    m.forEach((v, k) => {
      keys.push(k);
    });
    return keys;
  }

  // add update features
  parseItems(ids: Array<string>, stale = false) {
    if (!ids || !Array.isArray(ids)) {
      return;
    }
    if (!this.source) {
      return;
    }
    ids.forEach((w) => {
      if (this.targetType && w.indexOf(this.targetType) !== 0) {
        return;
      }
      if (this.targets.has(w)) {
        const target = this.targets.get(w);
        // ** target **
        let f = this.source.getFeatureById(w);
        if (f) {
          // exists so update it
          if (target.position) {
            f.setGeometry(new Point(fromLonLat(target.position)));
            f.setStyle(this.buildStyle(target, stale));
            f.set('name', target.name ?? target.mmsi ?? '', true);
          } else {
            this.source.removeFeature(f);
          }
        } else {
          // does not exist so create it
          if (target.position) {
            f = new Feature({
              geometry: new Point(fromLonLat(target.position)),
              name: target.name
            });
            f.setId(w);
            f.setStyle(this.buildStyle(target, stale));
            f.set('name', target.name ?? target.mmsi ?? '', true);
            this.source.addFeature(f);
          }
        }
      }
    });
  }

  // remove features
  removeItems(ids: Array<string>) {
    if (!ids || !Array.isArray(ids)) {
      return;
    }
    if (!this.source) {
      return;
    }
    ids.forEach((w) => {
      if (this.targetType && w.indexOf(this.targetType) != 0) {
        return;
      }
      const f = this.source.getFeatureById(w);
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }

  // build target style
  buildStyle(item: any, setStale = false): Style {
    let s: Style;
    // label text
    const lbl = item.name ?? item.callsign ?? item.mmsi ?? '';
    // ** stale check time ref
    const now = new Date().valueOf();
    if (typeof this.targetStyles !== 'undefined') {
      if (setStale || (item.lastUpdated as any) < now - this.inactiveTime) {
        // stale
        s = this.targetStyles.inactive ?? this.targetStyles.default;
      } else {
        s = this.targetStyles.default;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      s = this.layerProperties.style;
    } else {
      s = new Style({
        image: new RegularShape({
          points: 3,
          radius: 7,
          fill: new Fill({ color: 'magenta' }),
          stroke: new Stroke({
            color: 'black',
            width: 1
          }),
          rotateWithView: true
        })
      });
    }

    s = this.setRotation(this.setTextLabel(s, lbl), item.orientation);
    return s;
  }

  // update feature labels
  updateLabels() {
    this.source.getFeatures().forEach((f: Feature) => {
      const s: any = f.getStyle();
      f.setStyle(this.setTextLabel(s, f.get('name')));
    });
  }

  // return a Style with label text set
  setTextLabel(s: Style, text: string): Style {
    if (!s) {
      return s;
    }
    const cs = s.clone();
    const ts = cs.getText();
    if (ts) {
      ts.setText(Math.abs(this.mapZoom) >= this.labelMinZoom ? text : '');
      cs.setText(ts);
    }
    return cs;
  }

  // return a Style with rotation set
  setRotation(s: Style, value: number): Style {
    if (!s) {
      return s;
    }
    const cs = s.clone();
    const im = cs.getImage();
    if (im) {
      im.setRotation(value ?? 0);
      cs.setImage(im);
    }
    return cs;
  }
}
