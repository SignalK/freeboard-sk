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
import { Style, Text, Stroke, Fill } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { SKTrack } from 'src/app/modules';
import { LightTheme, DarkTheme } from '../themes';

// ** Freeboard Track resources collection format **
@Component({
  selector: 'ol-map > fb-tracks',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;
  protected theme = LightTheme;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() tracks: Array<{ [key: string]: SKTrack }>;
  @Input() trackStyles: { [key: string]: Style };
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
    this.parseTracks(this.tracks);
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

      for (const key in changes) {
        if (key === 'tracks') {
          this.parseTracks(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'trackStyles') {
          // handle track style change
        } else if (
          key === 'labelMinZoom' ||
          key === 'mapZoom' ||
          key === 'darkMode'
        ) {
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
  parseTracks(tracks: Array<{ [key: string]: any }> = this.tracks) {
    const fa: Feature[] = [];
    for (const w of tracks) {
      const f = new Feature({
        geometry: new MultiLineString(
          this.parseCoordinates(w.feature.geometry.coordinates)
        ),
        name: w.feature.properties.name
      });
      f.setId('track.' + w.feature.id);
      f.setStyle(this.buildStyle(w));
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

  // build track style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStyle(trk: any): Style {
    if (typeof this.trackStyles !== 'undefined') {
      if (trk.feature.properties.skType) {
        return this.setTextLabel(
          this.trackStyles[trk.feature.properties.skType],
          trk.feature.properties.name
        );
      } else {
        return this.setTextLabel(
          this.trackStyles.default,
          trk.feature.properties.name
        );
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.setTextLabel(
        this.layerProperties.style,
        trk.feature.properties.name
      );
    } else {
      // default styles
      const s = new Style({
        stroke: new Stroke({
          color: 'rgb(146,11,153)',
          width: 2,
          lineDash: [5, 5]
        }),
        text: new Text({
          text: '',
          textAlign: 'center'
        })
      });
      return this.setTextLabel(s, trk.feature.properties.name);
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

  // ** mapify and transform MultiLineString coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCoordinates(mls: Array<any>) {
    const lines = [];
    mls.forEach((line) => lines.push(mapifyCoords(line)));
    return fromLonLatArray(lines);
  }
}
