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
import { Style, Stroke, Icon } from 'ol/style';
import { Geometry, Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { Options } from 'ol/style/Icon';

const vesselIconDef = {
  src: './assets/img/vessels/self.png',
  anchor: [9.5, 22.5],
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels',
  size: [50, 50],
  scale: 0.9, //0.75,
  rotateWithView: true
};

const inactiveVesselStyle = new Style({
  image: new Icon({
    src: './assets/img/vessels/self_blur.png',
    anchor: [9.5, 22.5],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    size: [50, 50],
    scale: 0.75,
    rotateWithView: true
  })
});

const fixedVesselStyle = new Style({
  image: new Icon({
    src: './assets/img/vessels/self_fixed.png',
    anchor: [22.5, 50],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    size: [50, 50],
    scale: 0.5,
    rotateWithView: false
  })
});

// ** Freeboard Vessel component **
@Component({
  selector: 'ol-map > fb-vessel',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VesselComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();

  @Input() id: string;
  @Input() activeId: string;
  @Input() position: Coordinate;
  @Input() heading = 0;
  @Input() vesselStyles: { [key: string]: Style };
  @Input() vesselLines: { [key: string]: Array<Coordinate> };
  @Input() fixedLocation: boolean;
  @Input() iconScale = 1;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  vessel: Feature;
  headingLine: Feature;
  selfStyle: Style;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const fa = [];
    this.parseVessel();
    if (this.vessel) {
      fa.push(this.vessel);
    }
    this.renderVesselLines();
    if (this.headingLine) {
      fa.push(this.headingLine);
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
        if (
          key === 'id' ||
          key === 'activeId' ||
          key === 'position' ||
          key === 'heading'
        ) {
          if (this.source) {
            this.parseVessel();
          }
        } else if (key === 'vesselLines') {
          if (this.source) {
            this.renderVesselLines();
          }
        } else if (key === 'vesselStyles' || key === 'iconScale') {
          if (this.source) {
            this.generateSelfStyle();
            this.parseVessel();
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

  parseVessel() {
    if (!this.vessel) {
      // create feature
      this.vessel = new Feature(
        new Point(fromLonLat([this.position[0] ?? 0, this.position[1] ?? 0]))
      );
    }
    // update feature
    if (
      this.position &&
      Array.isArray(this.position) &&
      this.position.length > 1
    ) {
      const g: Geometry = this.vessel.getGeometry();
      (g as Point).setCoordinates(
        fromLonLat([this.position[0], this.position[1]])
      );
    }
    this.vessel.setId(this.id ?? 'self');
    const s = this.buildStyle();
    if (s) {
      const im = (s as Style).getImage();
      if (im) {
        if (this.fixedLocation) {
          im.setRotation(0);
        } else {
          im.setRotation(this.heading);
        }
      }
      this.vessel.setStyle(s);
    }
  }

  // default self style with specified scale
  generateSelfStyle() {
    if (this.iconScale) {
      vesselIconDef.scale = Math.abs(this.iconScale);
    }
    this.selfStyle = new Style({
      image: new Icon(vesselIconDef as Options)
    });
  }

  // build target style
  buildStyle(): Style {
    if (!this.selfStyle) {
      this.generateSelfStyle();
    }
    // default style with speciifed scale
    let cs = this.selfStyle;

    if (this.vesselStyles) {
      // use supplied styles
      if (this.fixedLocation) {
        if (this.vesselStyles.fixed) {
          cs = this.vesselStyles.fixed;
        }
      } else {
        if (this.activeId && this.activeId !== this.id) {
          if (this.vesselStyles.inactive) {
            cs = this.vesselStyles.inactive;
          }
        } else {
          if (this.vesselStyles.default) {
            cs = this.vesselStyles.default;
          }
        }
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      cs = this.layerProperties.style;
    } else {
      // use default styles
      if (this.fixedLocation) {
        cs = fixedVesselStyle;
      } else {
        if (this.activeId && this.activeId !== this.id) {
          cs = inactiveVesselStyle;
        }
      }
    }
    return cs;
  }

  // remove feature from layer
  removeFeature(f: Feature) {
    if (this.source) {
      this.source.removeFeature(f);
    }
  }

  renderVesselLines() {
    if (!this.vesselLines) {
      return;
    }
    if ('heading' in this.vesselLines) {
      this.headingLine = this.updateLine(
        this.headingLine,
        this.vesselLines.heading
      );
      this.headingLine.setStyle(
        new Style({
          stroke: new Stroke({ color: 'rgba(221, 99, 0, 0.5)', width: 4 })
        })
      );
    } else {
      this.removeFeature(this.headingLine);
    }
  }

  // ** update line geometry **
  updateLine(lf: Feature, coords: Array<Coordinate>) {
    if (!coords || !Array.isArray(coords)) {
      return;
    }
    if (!lf) {
      // create feature
      lf = new Feature(new LineString(fromLonLatArray(mapifyCoords(coords))));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = lf.getGeometry();
      g.setCoordinates(fromLonLatArray(mapifyCoords(coords)));
    }
    return lf;
  }
}
