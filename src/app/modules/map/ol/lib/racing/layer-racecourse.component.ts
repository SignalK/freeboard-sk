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
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { Geometry, LineString, Point } from 'ol/geom';
import { toLonLat, fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { LightTheme, DarkTheme } from '../themes';
import { getRhumbLineBearing } from 'geolib';
import { GeolibInputCoordinates } from 'geolib/es/types';
import { StyleLike } from 'ol/style/Style';

@Component({
  selector: 'ol-map > fb-racecourse',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RaceCourseLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;
  protected theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() markers: { [key: string]: any };
  @Input() racecourseStyles: { [key: string]: Style };
  @Input() darkMode = false;
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
    this.theme = this.darkMode ? DarkTheme : LightTheme;
    this.parseMarkers(this.markers);
    this.source = new VectorSource({ features: this.features });
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

      if ('markers' in changes) {
        this.parseMarkers(changes['markers'].currentValue);
        if (this.source) {
          this.source.clear();
          this.source.addFeatures(this.features);
          this.updateLabels();
        }
      }

      for (const key in changes) {
        if (key === 'labelMinZoom' || key === 'mapZoom' || key === 'darkMode') {
          if (key === 'darkMode') {
            this.theme = changes[key].currentValue ? DarkTheme : LightTheme;
          }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseMarkers(routes: { [key: string]: any } = this.markers) {
    const fa: Feature[] = [];
    for (const w in routes) {
      const c = fromLonLatArray(
        mapifyCoords(routes[w].feature.geometry.coordinates)
      );
      const f = new Feature({
        geometry: new LineString(c),
        name: routes[w].name
      });
      f.setId('marker.' + w);
      f.set(
        'pointMetadata',
        routes[w].feature.properties.coordinatesMeta ?? null
      );
      //f.setStyle(this.buildStartFinishLineStyle(f));
      fa.push(f);
    }
    this.features = fa;
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
      const s: StyleLike = f.getStyle();
      if (Array.isArray(s)) {
        const ps = s.filter(
          (st) => (st.getGeometry() as Geometry)?.getType() === 'Point'
        );
        const md = f.get('pointMetadata');
        if (Array.isArray(md) && md.length === ps.length) {
          for (let i = 0; i < ps.length; i++) {
            if (md[i].name) {
              const t =
                Math.abs(this.mapZoom) >= this.labelMinZoom ? md[i].name : '';
              ps[i].getText()?.setText(t);
              ps[i]
                .getText()
                ?.setFill(new Fill({ color: this.theme.labelText.color }));
            }
          }
        }
      } else {
        (s as Style).getText()?.setText(f.get('name'));
        (s as Style)
          .getText()
          ?.setFill(new Fill({ color: this.theme.labelText.color }));
      }
      f.setStyle(s);
    });
  }

  // return a Style with label text
  setTextLabel(s: Style, text = ''): Style {
    //const cs = s.clone();
    const ts = s.getText();
    if (ts) {
      ts.setText(Math.abs(this.mapZoom) >= this.labelMinZoom ? text : '');
      ts.setFill(new Fill({ color: this.theme.labelText.color }));
    }
    return s;
  }

  // build start/finish line features
  parseStartFinishLine(rte): Feature[] {
    const sfla: Feature[] = [];

    // start line
    if (
      rte.feature.properties.startLine &&
      rte.feature.properties.startLine.pin &&
      rte.feature.properties.startLine.boat
    ) {
      const slp = fromLonLat(rte.feature.properties.startLine.pin);
      const slb = fromLonLat(rte.feature.properties.startLine.boat);

      const sl = new Feature({
        geometry: new LineString([slp, slb]),
        name: 'start'
      });
      sl.setId('startline');
      sl.setStyle(
        this.setTextLabel(
          this.buildStartFinishLineStyle('startLine'),
          sl.get('name')
        )
      );
      sfla.push(sl);

      const sp = new Feature({
        geometry: new Point(slp)
      });
      sp.setId('startline.pin');
      sp.setStyle(this.buildStartFinishLineStyle('startPin'));
      sfla.push(sp);

      const sb = new Feature({
        geometry: new Point(slb)
      });
      sb.setId('startline.boat');
      sb.setStyle(this.buildStartFinishLineStyle('startBoat'));
      sfla.push(sb);
    }

    // finish line
    if (rte.feature.properties.finishLine) {
      const fla = fromLonLatArray(rte.feature.properties.finishLine);

      const fl = new Feature({
        geometry: new LineString(fla),
        name: 'finish'
      });
      fl.setId('finishline');
      fl.set('name', 'finish');
      fl.setStyle(
        this.setTextLabel(
          this.buildStartFinishLineStyle('finishLine'),
          fl.get('name')
        )
      );
      sfla.push(fl);

      const fp = new Feature({
        geometry: new Point(fla[0])
      });
      fp.setId('finishline.s');
      fp.setStyle(this.buildStartFinishLineStyle('finishPin'));
      sfla.push(fp);

      const fb = new Feature({
        geometry: new Point(fla[1])
      });
      fb.setId('finishline.e');
      fb.setStyle(this.buildStartFinishLineStyle('finishPin'));
      sfla.push(fb);
    }

    return sfla;
  }

  // build start-line style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStartFinishLineStyle(styleName: string): Style {
    if (typeof this.racecourseStyles !== 'undefined') {
      if (
        styleName === 'startPin' &&
        typeof this.racecourseStyles.startPin !== 'undefined'
      ) {
        return this.racecourseStyles.startPin;
      } else if (
        styleName === 'startBoat' &&
        typeof this.racecourseStyles.startBoat !== 'undefined'
      ) {
        return this.racecourseStyles.startBoat;
      } else if (
        styleName === 'startLine' &&
        typeof this.racecourseStyles.startLine !== 'undefined'
      ) {
        return this.racecourseStyles.startLine;
      } else if (
        styleName === 'finishLine' &&
        typeof this.racecourseStyles.finishLine !== 'undefined'
      ) {
        return this.racecourseStyles.finishLine;
      } else if (
        styleName === 'finishPin' &&
        typeof this.racecourseStyles.finishPin !== 'undefined'
      ) {
        return this.racecourseStyles.finishPin;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.layerProperties.style;
    } else {
      // default styles
      let s: Style;
      if (styleName === 'startLine') {
        s = new Style({
          stroke: new Stroke({
            color: 'black',
            width: 2,
            lineDash: [2, 4]
          })
        });
      } else if (styleName === 'startPin') {
        s = new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'green' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            })
          }),
          text: new Text({
            text: '',
            offsetY: -10
          })
        });
      } else if (styleName === 'startBoat') {
        s = new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'green' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            })
          }),
          text: new Text({
            text: '',
            offsetY: -10
          })
        });
      } else if (styleName === 'finishLine') {
        s = new Style({
          stroke: new Stroke({
            color: 'black',
            width: 4,
            lineDash: [2, 4]
          })
        });
      } else if (styleName === 'finishPin') {
        s = new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'gray' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            })
          }),
          text: new Text({
            text: '',
            offsetY: -10
          })
        });
      }

      return s;
    }
  }
}
