/** Freeboard Feature Layer Base Component
 * Abstract class for Freeboard Feature layers
 **/

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
import { Style, Fill, Text } from 'ol/style';
import { MapComponent } from './map.component';
import { Extent } from './models';
import { AsyncSubject } from 'rxjs';
import { LightTheme, DarkTheme } from './themes';

@Component({
  selector: 'ol-map > fb-feature-layer',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FBFeatureLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected theme = LightTheme;
  protected labelPrefixes = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

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
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource();
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
      this.layer.setProperties(properties, false);

      this.handleAttributeChanges(changes);
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

  protected handleAttributeChanges(changes: SimpleChanges) {
    if ('darkMode' in changes) {
      this.theme = changes['darkMode'].currentValue ? DarkTheme : LightTheme;
      this.onDarkMode(changes['darkMode'].currentValue);
    } else if (
      'labelMinZoom' in changes &&
      typeof this.mapZoom !== 'undefined'
    ) {
      this.onLabelMinZoomSet(changes['labelMinZoom'].currentValue);
    } else if (
      'mapZoom' in changes &&
      typeof this.labelMinZoom !== 'undefined'
    ) {
      const change = changes['mapZoom'];
      if (
        (change.currentValue >= this.labelMinZoom &&
          change.previousValue < this.labelMinZoom) ||
        (change.currentValue < this.labelMinZoom &&
          change.previousValue >= this.labelMinZoom)
      ) {
        this.onLabelZoomThreshold(change.currentValue >= this.labelMinZoom);
      }
    }
  }

  /** Called when dark mode is set / cleared.
   * @override
   * @param isSet true when dark mode is set
   */
  onDarkMode(isSet: boolean) {
    this.updateLabels();
  }

  /** Called when label zoom threshold is set.
   * @override
   * @param value new threshold value
   */
  onLabelMinZoomSet(value: number) {
    this.updateLabels();
  }

  /** Called when label zoom threshold crossed.
   * @override
   * @param entered true when transition is from below to above threshold
   */
  onLabelZoomThreshold(entered: boolean) {
    this.updateLabels();
  }

  /** update the labels of features with an id that contains
   * one of the values in this.match.
   */
  updateLabels() {
    if (!this.source) {
      return;
    }
    this.source.getFeatures().forEach((f: Feature) => {
      const id = f.getId() as string;
      if (this.labelPrefixes.some((i: string) => id.includes(i))) {
        const s: Style = f.getStyle() as Style;
        f.setStyle(this.setTextLabel(s, f.get('name')));
      }
    });
  }

  /** return a Style with supplied label text
   * @param style openlayers Style containing text
   * @param text string containing
   */
  setTextLabel(style: Style, text: string): Style {
    let ts: Text;
    if (!style || typeof style === 'function') {
      return style;
    } else if (Array.isArray(style)) {
      if (style.length !== 0) {
        ts = style[0].getText();
      }
    } else {
      ts = style.getText();
    }
    if (ts) {
      ts.setText(Math.abs(this.mapZoom) >= this.labelMinZoom ? text : '');
      ts.setFill(new Fill({ color: this.theme.labelText.color }));
      if (Array.isArray(style)) {
        style[0].setText(ts);
      } else {
        style.setText(ts);
      }
    }
    return style;
  }

  /** return a Style containing an image rotated to the supplied value
   * @param style openlayers Style containing an image
   * @param value angle in radians to rotate the image
   */
  setRotation(style: Style, value: number): Style {
    if (!style || typeof style === 'function') {
      return style;
    }
    const im = style.getImage();
    if (im) {
      im.setRotation(value ?? 0);
      style.setImage(im);
    }
    return style;
  }
}
