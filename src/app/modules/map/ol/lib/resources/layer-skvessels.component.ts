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
import { Style, RegularShape, Fill, Stroke, Circle } from 'ol/style';
import { Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { GeoUtils } from 'src/app/lib/geoutils';
import { AsyncSubject } from 'rxjs';
import { SKVessel } from 'src/app/modules';
import { LightTheme, DarkTheme } from '../themes';
import { fromLonLatArray } from '../util';
import { Coordinate } from 'ol/coordinate';

// ** Signal K Other Vessels  **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SKVesselsLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected targetType = 'vessel';
  protected theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() targets: Map<string, SKVessel> = new Map();
  @Input() targetStyles: { [key: string]: Style };
  @Input() darkMode = false;
  @Input() focusId: string;
  @Input() inactiveTime = 180000; // in ms (3 mins)
  @Input() labelMinZoom = 10;
  @Input() mapZoom = 10;
  @Input() showVector = true;
  @Input() vectorMinZoom = 15;
  @Input() vectorApparent = false;
  @Input() filterByShipType: boolean;
  @Input() filterShipTypes: Array<number>;
  @Input() filterIds: Array<string>;
  @Input() updateIds: Array<string> = [];
  @Input() staleIds: Array<string> = [];
  @Input() removeIds: Array<string> = [];
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  protected zoomOffsetLevel = [
    1, 1000000, 550000, 290000, 140000, 70000, 38000, 17000, 7600, 3900, 1900,
    950, 470, 250, 120, 60, 30, 15.5, 8.1, 4, 2, 1, 0.5, 0.25, 0.12, 0.06, 0.03,
    0.015, 0.008, 1
  ];

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

    this.theme = this.darkMode ? DarkTheme : LightTheme;
    this.reloadTargets();

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
      const keys = Object.keys(changes);
      if (
        (keys.includes('targets') &&
          changes['targets'].previousValue.size === 0) ||
        keys.includes('filterShipTypes') ||
        keys.includes('filterByShipType')
      ) {
        this.reloadTargets();
      } else {
        if (keys.includes('removeIds')) {
          this.removeTargetIds(changes['removeIds'].currentValue);
        }
        if (keys.includes('updateIds')) {
          this.updateTargetIds(changes['updateIds'].currentValue);
        }
        if (keys.includes('staleIds')) {
          this.updateTargetIds(changes['staleIds'].currentValue, true);
        }
        if (
          (keys.includes('targetStyles') &&
            !changes['targetStyles'].firstChange) ||
          keys.some((k) =>
            ['inactiveTime', 'focusId', 'filterIds', 'vectorApparent'].includes(
              k
            )
          )
        ) {
          this.updateTargetIds(this.extractKeys(this.targets));
        }
      }

      for (const key in changes) {
        if (
          ['darkMode', 'labelMinZoom', 'mapZoom', 'vectorMinZoom'].includes(key)
        ) {
          if (key === 'darkMode') {
            this.theme = changes[key].currentValue ? DarkTheme : LightTheme;
          }
          this.handleAttributeChanges(key, changes[key]);
        } else {
          if (key === 'layerProperties') {
            this.layer.setProperties(properties, false);
          } else {
            [
              'opacity',
              'visible',
              'extent',
              'zIndex',
              'minResolution',
              'maxResolution'
            ].includes(key);
            properties[key] = changes[key].currentValue;
          }
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

  extractKeys(m: Map<string, SKVessel>): Array<string> {
    const keys = [];
    m.forEach((v, k) => {
      if (k.indexOf(this.targetType) !== -1) {
        keys.push(k);
      }
    });
    return keys;
  }

  // returns true if target should be rendered
  okToRenderTarget(id: string): boolean {
    // IMO only
    const imo =
      Array.isArray(this.filterShipTypes) &&
      this.filterShipTypes.includes(-999);
    const checkImo = (id: string) => {
      if (imo) {
        const t = this.targets.get(id);
        if ('imo' in t.registrations) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

    if (this.filterByShipType && Array.isArray(this.filterShipTypes)) {
      const st = Math.floor(this.targets.get(id).type.id / 10) * 10;
      return this.filterShipTypes.includes(st) && checkImo(id);
    }
    if (!this.filterIds) {
      return checkImo(id);
    }
    if (Array.isArray(this.filterIds)) {
      return this.filterIds.includes(id) && checkImo(id);
    } else {
      return checkImo(id);
    }
  }

  // reload all Features from this.targets
  reloadTargets() {
    if (!this.targets || !this.source) {
      return;
    }
    this.source.clear();
    this.extractKeys(this.targets).forEach((id: string) =>
      this.addTargetWithId(id)
    );
  }

  // update Features with supplied ids
  updateTargetIds(ids: Array<string>, areStale = false) {
    if (!this.source) {
      return;
    }
    ids.forEach((id: string) => {
      if (id.includes('vessel') && this.targets.has(id)) {
        const target = this.targets.get(id);
        const f = this.source.getFeatureById('ais-' + id) as Feature;
        if (!f) {
          this.addTargetWithId(id);
        } else {
          if (this.okToRenderTarget(id) && target.position) {
            const label =
              target.name ??
              target.callsignVhf ??
              target.callsignHf ??
              target.mmsi ??
              '';
            f.setGeometry(new Point(fromLonLat(target.position)));
            f.set('name', label, true);
            const s = this.buildTargetStyle(id, target, areStale).clone();
            f.setStyle(
              this.setTextLabel(this.setRotation(s, target.orientation), label)
            );
            this.parseWindVector(id, target);
            this.parseCogLine(id, target);
          } else {
            this.removeTargetIds([id]);
          }
        }
      }
    });
  }

  // add new target feature
  addTargetWithId(id: string) {
    if (!id.includes('vessel') || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id);
    if (this.okToRenderTarget(id) && target.position) {
      const label =
        target.name ??
        target.callsignVhf ??
        target.callsignHf ??
        target.mmsi ??
        '';
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position)),
        name: target.name
      });
      f.setId('ais-' + id);
      f.set('name', label, true);
      const s = this.buildTargetStyle(id, target).clone();
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
      this.parseWindVector(id, target);
      this.parseCogLine(id, target);
    }
  }

  // remove target features
  removeTargetIds(ids: Array<string>) {
    if (!ids || !Array.isArray(ids)) {
      return;
    }
    if (!this.source) {
      return;
    }
    ids.forEach((w) => {
      let f = this.source.getFeatureById('ais-' + w) as Feature;
      if (f) {
        this.source.removeFeature(f);
      }
      f = this.source.getFeatureById('wind-' + w) as Feature;
      if (f) {
        this.source.removeFeature(f);
      }
      f = this.source.getFeatureById('cog-' + w) as Feature;
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }

  // build target feature style
  buildTargetStyle(id: string, item: SKVessel, setStale = false): Style {
    let s: Style;

    // ** stale check time ref
    const now = new Date().valueOf();
    const st = item.type.id ? Math.floor(item.type.id / 10) * 10 : -1;

    if (typeof this.targetStyles !== 'undefined') {
      if (id === this.focusId && this.targetStyles.focus) {
        s = this.targetStyles.focus;
      } else if (
        setStale ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item.lastUpdated as any) < now - this.inactiveTime
      ) {
        // stale
        s = this.targetStyles.inactive;
      } else if (item.type && this.targetStyles[st]) {
        // ship type & state
        if (item.state && this.targetStyles[st][item.state]) {
          s = this.targetStyles[st][item.state];
        } else {
          s = this.targetStyles[st]['default'];
        }
      } else if (item.buddy && this.targetStyles.buddy) {
        // buddy
        s = this.targetStyles.buddy;
      } else {
        // all others
        if (item.state && this.targetStyles[item.state]) {
          // state only
          s = this.targetStyles[item.state];
        } else {
          s = this.targetStyles.default;
        }
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      s = this.layerProperties.style;
    } else {
      if (id === this.focusId) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else if (
        setStale ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item.lastUpdated as any) < now - this.inactiveTime
      ) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'magenta' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
    }
    return s;
  }

  handleAttributeChanges(key: string, change: SimpleChange) {
    if (key === 'labelMinZoom' || key === 'darkMode') {
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabels();
      }
    } else if (key === 'vectorMinZoom') {
      if (typeof this.mapZoom !== 'undefined') {
        this.targets.forEach((v, k) => {
          this.parseWindVector(k, v);
        });
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
          this.toggleCogLines();
        }
      }
      if (typeof this.vectorMinZoom !== 'undefined') {
        if (
          (change.currentValue >= this.vectorMinZoom &&
            change.previousValue < this.vectorMinZoom) ||
          (change.currentValue < this.vectorMinZoom &&
            change.previousValue >= this.vectorMinZoom)
        ) {
          this.targets.forEach((v, k) => {
            this.parseWindVector(k, v);
          });
        }
      }
    }
  }

  // add update Wind vector
  parseWindVector(id: string, target: SKVessel) {
    if (!this.source) {
      return;
    }
    if (!target.wind || typeof target.orientation === 'undefined') {
      return;
    }
    const windDirection = this.vectorApparent
      ? typeof target.wind.awa !== 'undefined'
        ? target.orientation + target.wind.awa
        : null
      : target.wind.direction;
    if (typeof windDirection !== 'number') {
      return;
    }

    let wf = this.source.getFeatureById('wind-' + id) as Feature;
    if (!this.showVector || !target.position) {
      if (wf) {
        this.source.removeFeature(wf);
      }
      return;
    }

    const windc = GeoUtils.destCoordinate(
      target.position,
      windDirection,
      this.zoomOffsetLevel[Math.floor(this.mapZoom)]
    );
    if (wf) {
      // update vector
      wf.setGeometry(
        new LineString([fromLonLat(target.position), fromLonLat(windc)])
      );
      wf.setStyle(this.buildVectorStyle(id));
    } else {
      // create vector
      wf = new Feature(
        new LineString([fromLonLat(target.position), fromLonLat(windc)])
      );
      wf.setId('wind-' + id);
      wf.setStyle(this.buildVectorStyle(id));
      this.source.addFeature(wf);
    }
  }

  // add update COG vector
  parseCogLine(id: string, target: SKVessel) {
    if (!this.source || !target.vectors.cog) {
      return;
    }

    let cf = this.source.getFeatureById('cog-' + id) as Feature;
    if (
      !this.okToRenderCogLines ||
      !this.okToRenderTarget(id) ||
      !target.position
    ) {
      if (cf) {
        this.source.removeFeature(cf);
      }
      return;
    }

    if (cf) {
      // update vector
      cf.setGeometry(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setStyle(this.buildCogLineStyle(id, cf));
    } else {
      // create vector
      cf = new Feature(new LineString(fromLonLatArray(target.vectors.cog)));
      cf.setId('cog-' + id);
      cf.setStyle(this.buildCogLineStyle(id, cf));
      this.source.addFeature(cf);
    }
  }

  // ok to show cog lines
  okToRenderCogLines() {
    return this.mapZoom >= this.labelMinZoom;
  }

  // show / hide cog vector
  toggleCogLines() {
    if (!this.okToRenderCogLines()) {
      this.source.forEachFeature((cl: Feature<LineString>) => {
        if ((cl.getId() as string).includes('cog-')) {
          this.source.removeFeature(cl);
        }
      });
    } else {
      this.targets.forEach((v, k) => {
        this.parseCogLine(k, v);
      });
    }
  }

  buildCogLineStyle(id: string, feature: Feature) {
    const opacity =
      this.okToRenderTarget(id) && this.okToRenderCogLines() ? 0.7 : 0;
    const geometry = feature.getGeometry() as LineString;
    const color = `rgba(0,0,0, ${opacity})`;
    const styles = [];
    styles.push(
      new Style({
        stroke: new Stroke({
          color: color,
          width: 1,
          lineDash: [5, 5]
        })
      })
    );
    geometry.forEachSegment((start: Coordinate, end: Coordinate) => {
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 2,
            stroke: new Stroke({
              color: color,
              width: 1
            }),
            fill: new Fill({ color: 'transparent' })
          })
        })
      );
    });
    return styles;
  }

  // build wind vector style
  buildVectorStyle(id: string): Style {
    const color = this.vectorApparent ? '16, 75, 16' : '128, 128, 0';
    let opacity = this.okToRenderTarget(id) ? 1 : 0;
    opacity = this.mapZoom < this.vectorMinZoom ? 0 : opacity;
    return new Style({
      stroke: new Stroke({
        width: 2,
        color: `rgba(${color},${opacity})`
      })
    });
  }

  // update feature labels
  updateLabels() {
    this.source.getFeatures().forEach((f: Feature) => {
      const id = f.getId();
      if ((id as string).includes('ais-')) {
        const s: Style = f.getStyle() as Style;
        f.setStyle(this.setTextLabel(s, f.get('name')));
      }
    });
  }

  // return a Style with label text set
  setTextLabel(s: Style, text: string): Style {
    if (!s) {
      return s;
    }
    const ts = s.getText();
    if (ts) {
      ts.setText(Math.abs(this.mapZoom) >= this.labelMinZoom ? text : '');
      ts.setFill(new Fill({ color: this.theme.labelText.color }));
      s.setText(ts);
    }
    return s;
  }

  // return a Style with rotation set
  setRotation(s: Style, value: number): Style {
    if (!s) {
      return s;
    }
    const im = s.getImage();
    if (im) {
      im.setRotation(value ?? 0);
      s.setImage(im);
    }
    return s;
  }
}
