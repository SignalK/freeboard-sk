import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import {
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon
} from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray } from '../util';
import { AsyncSubject } from 'rxjs';
import { SKResourceSet } from 'src/app/modules';
import { LightTheme, DarkTheme } from '../themes';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > fb-resource-sets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceSetLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;
  protected theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed
  @Input() darkMode = false;
  @Input() resourceSets: Array<SKResourceSet> = [];
  @Input() selected: Array<string> = [];
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
    this.parseResourceSets(this.resourceSets);
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    this.theme = this.darkMode ? DarkTheme : LightTheme;

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
        if (key === 'resourceSets') {
          this.parseResourceSets(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (
          key === 'labelMinZoom' ||
          key === 'mapZoom' ||
          key === 'darkMode'
        ) {
          this.theme =
            key === 'darkMode' && changes[key].currentValue
              ? DarkTheme
              : LightTheme;
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

  // process resource sets
  parseResourceSets(resourceSets: Array<SKResourceSet>) {
    this.features = [];
    for (const r of resourceSets) {
      if (this.selected.includes(r.id)) {
        this.parseResources(r);
      }
    }
  }

  // process a resource set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseResources(rSet: { [key: string]: any }) {
    const fa: Feature[] = [];
    for (const w of rSet.values.features) {
      let f: Feature;
      if (w.geometry.type === 'Point') {
        f = new Feature({
          geometry: new Point(fromLonLat(w.geometry.coordinates)),
          name: w.properties.name
        });
      }
      if (w.geometry.type === 'MultiPoint') {
        f = new Feature({
          geometry: new MultiPoint(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name
        });
      } else if (w.geometry.type === 'LineString') {
        f = new Feature({
          geometry: new LineString(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name
        });
      } else if (w.geometry.type === 'MultiLineString') {
        f = new Feature({
          geometry: new MultiLineString(
            fromLonLatArray(w.geometry.coordinates)
          ),
          name: w.properties.name
        });
      } else if (w.geometry.type === 'Polygon') {
        f = new Feature({
          geometry: new Polygon(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name
        });
      } else if (w.geometry.type === 'MultiPolygon') {
        f = new Feature({
          geometry: new MultiPolygon(fromLonLatArray(w.geometry.coordinates)),
          name: w.properties.name
        });
      }
      if (!f) {
        continue;
      }
      // set style
      if (typeof rSet.styles !== 'undefined') {
        let rs: Style;
        if (typeof w.properties.styleRef !== 'undefined') {
          rs = this.buildStyle(
            rSet.styles[w.properties.styleRef],
            w.geometry.type
          );
        } else if (typeof w.properties.style !== 'undefined') {
          rs = this.buildStyle(w.properties.style, w.geometry.type);
        } else {
          rs = this.buildStyle(rSet.styles.default, w.geometry.type);
        }
        f.setStyle(this.setTextLabel(rs, w.properties.name));
      }
      fa.push(f);
    }
    this.features = this.features.concat(fa);
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
    this.source.getFeatures().forEach((f: Feature) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s: any = f.getStyle();
      f.setStyle(this.setTextLabel(s, f.get('name')));
    });
  }

  // return a Style with label text
  setTextLabel(s: Style, text: string): Style {
    const cs = s.clone();
    cs.setText(
      new Text({
        text: Math.abs(this.mapZoom) >= this.labelMinZoom ? text : '',
        rotateWithView: false,
        offsetY: -12
      })
    );
    cs.setFill(new Fill({ color: this.theme.labelText.color }));
    return cs;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStyle(styleDef: { [key: string]: any }, geom): Style {
    const s = new Style();
    if (geom === 'Point' || geom === 'MulitPoint') {
      s.setImage(
        new Circle({
          radius: styleDef.width ?? 5,
          fill: new Fill({ color: styleDef.fill ?? 'blue' }),
          stroke: new Stroke({
            color: styleDef.stroke ?? 'blue',
            width: 2,
            lineDash: styleDef.lineDash ?? [1]
          })
        })
      );
    } else {
      s.setFill(new Fill({ color: styleDef.fill ?? 'blue' }));
      s.setStroke(
        new Stroke({
          color: styleDef.stroke ?? 'blue',
          width: styleDef.width ?? 2,
          lineDash: styleDef.lineDash ?? [1]
        })
      );
    }
    return s;
  }
}
