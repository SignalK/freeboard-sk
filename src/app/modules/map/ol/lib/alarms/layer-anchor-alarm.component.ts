import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  input,
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
import { Style, Stroke, Fill } from 'ol/style';
import { Circle, LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import type { Coordinate as MapCoordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import {
  fromLonLatArray,
  mapifyCoords,
  mapifyRadius,
  worldCopyOffset
} from '../util';
import { WORLD_WIDTH_3857 } from '../../../route-extend';
import { AsyncSubject } from 'rxjs';

/** Closer than this, in map units (metres), counts as the same point. */
const SAME_POINT_M = 1e-3;

/**
 * The anchor alarm's line to the vessel, watch circle and anchor point. They
 * are moved, not rebuilt, on every update: a Modify session started by tapping
 * the anchor holds that Feature object, and a rebuilt one would leave it
 * editing a Feature that is no longer drawn.
 */
export class AnchorFeatures {
  readonly line = new Feature<LineString>();
  readonly circle = new Feature<Circle>();
  readonly anchor = new Feature<Point>();

  constructor() {
    this.anchor.setId('anchor');
  }

  /**
   * Place the features at map coordinates and return those to draw.
   * @param holdAnchor leave the anchor point where it is, as while the user
   * drags it or the move is waiting for the server's answer
   */
  place(
    anchor: MapCoordinate,
    radius: number,
    line: MapCoordinate[] | null,
    holdAnchor: boolean
  ): Feature[] {
    const shown: Feature[] = [];
    if (line) {
      const lg = this.line.getGeometry();
      if (lg) lg.setCoordinates(line);
      else this.line.setGeometry(new LineString(line));
      shown.push(this.line);
    }
    const cg = this.circle.getGeometry();
    if (cg) cg.setCenterAndRadius(anchor, radius);
    else this.circle.setGeometry(new Circle(anchor, radius));
    shown.push(this.circle);
    const ag = this.anchor.getGeometry();
    if (!ag) {
      this.anchor.setGeometry(new Point(anchor));
    } else if (!holdAnchor) {
      // Stay in the world copy a Modify session shifted the point into, or its
      // hit-test would miss the anchor the user sees there.
      const [x, y] = ag.getCoordinates();
      const nx = anchor[0] + worldCopyOffset(x - anchor[0], WORLD_WIDTH_3857);
      // Any change makes a Modify session re-index the point, which drops a
      // drag that was pressed but has not moved yet; so only a real move is
      // written. The round trip through lon/lat alone shifts the point by
      // far less than a millimetre.
      if (
        Math.abs(x - nx) > SAME_POINT_M ||
        Math.abs(y - anchor[1]) > SAME_POINT_M
      ) {
        ag.setCoordinates([nx, anchor[1]]);
      }
    }
    shown.push(this.anchor);
    return shown;
  }
}

/** Make the source hold exactly these features, keeping those it already has. */
export function syncSource(source: VectorSource, features: Feature[]) {
  const wanted = new Set(features);
  source
    .getFeatures()
    .filter((f) => !wanted.has(f))
    .forEach((f) => source.removeFeature(f));
  features
    .filter((f) => !source.hasFeature(f))
    .forEach((f) => source.addFeature(f));
}

// ** Freeboard Anchor Alarm component **
@Component({
  selector: 'ol-map > fb-anchor-alarm',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AnchorAlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer?: Layer;
  public source?: VectorSource;
  protected features: Array<Feature> = [];
  protected anchorFeatures = new AnchorFeatures();

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected radius = input.required<number>();
  protected anchorPosition = input<Coordinate | null>();
  protected vesselPosition = input<Coordinate | null>();
  /** Keep the anchor point where it is drawn, not at anchorPosition. */
  protected holdAnchor = input<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() anchorStyles?: { [key: string]: any };
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: { [index: string]: any };

  protected mapifiedRadius = 0;
  protected mapifiedLine: Array<Coordinate> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.radius();
      this.anchorPosition();
      this.vesselPosition();
      this.holdAnchor();
      this.parseValues();
      if (this.source) {
        syncSource(this.source, this.features);
      }
    });
  }

  ngOnInit() {
    this.parseValues();
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
        if (key === 'layerProperties') {
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
      this.layer = undefined;
    }
  }

  parseValues() {
    const anchorPosition = this.anchorPosition();
    if (!anchorPosition) {
      this.features = [];
      return;
    }
    this.mapifiedRadius = mapifyRadius(
      this.radius() < 0 ? 0 : this.radius(),
      anchorPosition
    );
    const vesselPosition = this.vesselPosition();
    this.mapifiedLine = vesselPosition
      ? mapifyCoords([anchorPosition, vesselPosition])
      : [];
    const af = this.anchorFeatures;
    this.features = af.place(
      fromLonLat(anchorPosition),
      this.mapifiedRadius,
      vesselPosition ? fromLonLatArray(this.mapifiedLine) : null,
      this.holdAnchor()
    );
    // A restyle is a feature change, on which a Modify session re-indexes the
    // anchor, so only one that changes something is applied.
    for (const [f, key] of [
      [af.line, 'line'],
      [af.circle, 'circle'],
      [af.anchor, 'anchor']
    ] as const) {
      const style = this.buildStyle(key);
      if (f.getStyle() !== style) {
        f.setStyle(style);
      }
    }
  }

  // build target style
  buildStyle(key: string): Style {
    if (this.anchorStyles && this.anchorStyles[key]) {
      return this.anchorStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        // default style
        return new Style({
          stroke: new Stroke({
            width: 2,
            color: 'black',
            lineDash: [5, 5]
          }),
          fill: new Fill({
            color: 'rgba(0, 255, 0, .3)'
          })
        });
      }
    }
  }
}
