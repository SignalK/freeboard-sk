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
import { Style, RegularShape, Fill, Stroke, Circle } from 'ol/style';
import { Geometry, Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';

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
  @Input() showWind = false;
  @Input() fixedLocation: boolean;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  vessel: Feature;
  twdLine: Feature;
  awaLine: Feature;
  headingLine: Feature;
  cogLine: Feature;

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
    if (this.twdLine) {
      fa.push(this.twdLine);
    }
    if (this.awaLine) {
      fa.push(this.awaLine);
    }
    if (this.cogLine) {
      fa.push(this.cogLine);
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
        } else if (key === 'vesselLines' || key === 'showWind') {
          if (this.source) {
            this.renderVesselLines();
          }
        } else if (key === 'vesselStyles') {
          if (this.source) {
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

  // build target style
  buildStyle(): Style {
    let cs = new Style({
      // default style
      image: new RegularShape({
        points: 3,
        radius: 15,
        fill: new Fill({ color: 'red' }),
        stroke: new Stroke({
          color: 'black',
          width: 3
        }),
        rotateWithView: true,
        rotation: this.heading ?? 0
      })
    });

    if (this.vesselStyles) {
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
    if ('twd' in this.vesselLines) {
      this.twdLine = this.updateLine(this.twdLine, this.vesselLines.twd);
      this.twdLine.setStyle(
        new Style({
          stroke: new Stroke({
            color: `rgb(128, 128, 0, ${this.showWind ? 1 : 0})`,
            width: 2
          })
        })
      );
    } else {
      this.removeFeature(this.twdLine);
    }
    if ('awa' in this.vesselLines) {
      this.awaLine = this.updateLine(this.awaLine, this.vesselLines.awa);
      this.awaLine.setStyle(
        new Style({
          stroke: new Stroke({
            color: `rgb(16, 75, 16, ${this.showWind ? 1 : 0})`,
            width: 1
          })
        })
      );
    } else {
      this.removeFeature(this.awaLine);
    }
    if ('cog' in this.vesselLines) {
      this.cogLine = this.updateLine(this.cogLine, this.vesselLines.cog);
      this.cogLine.setStyle((feature: Feature) => {
        const color = 'rgba(204, 12, 225, 0.7)';
        const geometry = feature.getGeometry() as LineString;
        const styles = [];
        styles.push(
          new Style({
            stroke: new Stroke({ color: color, width: 1 })
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
      });
    } else {
      this.removeFeature(this.cogLine);
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
