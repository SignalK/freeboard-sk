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
  EventEmitter
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Text,RegularShape } from 'ol/style';
import { Polygon, Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { FBChart, FBCharts } from 'src/app/types';

const CHART_PROPERTY = "chart"
const COLOR_INDEX_PROPERTY = "colorIndex"
const boundStyles = ['red', 'magenta', 'blue', 'purple', 'green'];


// ** Show Chart bounds on map **
@Component({
  selector: 'ol-map > fb-chart-bounds',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartBoundsLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() charts: FBCharts;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };
  @Output() chartSelected: EventEmitter<FBChart> = new EventEmitter<FBChart>();

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseChartBounds(this.charts);
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

      // select
      map.on('singleclick', (e) => {
        if(this.layer) {
          this.layer.getFeatures(e.pixel).then((f) => {
            f.filter((f) => f.get(CHART_PROPERTY)).forEach((f) => {
              this.chartSelected.emit(f.get(CHART_PROPERTY))
            })
          })  
        }
      })
    }
  }


  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key === 'charts') {
          this.parseChartBounds(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
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

  parseChartBounds(charts: FBCharts) {
    const fa: Feature[] = [];
    let colorIndex = 0;

    // backdrop
    const f = new Feature({
      geometry: new Polygon([
        fromLonLatArray([
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90]
        ])
      ]),
      name: ''
    });
    f.setId('chart-bound.backdrop');
    f.setStyle(
      new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.4 )'
        })
      })
    );
    fa.push(f);

    // chart bounds
    for (const w of charts) {
      const c = this.parseBoundsCoordinates(w[1].bounds);
      if (c.length === 0) continue;
      // rectangle
      const f = new Feature({
        geometry: new Polygon(c),
        name: w[0],
        [CHART_PROPERTY]: w,
        [COLOR_INDEX_PROPERTY]: colorIndex
      });
      f.setId('chart-bound.' + w[0]);
      f.setStyle(this.buildStyles);
      fa.push(f);
      //
      colorIndex++;
      colorIndex = colorIndex === boundStyles.length ? 0 : colorIndex;
    }
    this.features = fa;
  }

  // mapify and transform bounds to polygon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseBoundsCoordinates(bounds: Array<number>) {
    if (
      !Array.isArray(bounds) ||
      bounds.length !== 4 ||
      (bounds[0] === -180 &&
        bounds[1] === -90 &&
        bounds[2] === 180 &&
        bounds[3] === 90)
    )
      return [];
    const rect = mapifyCoords(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[1]],
        [bounds[2], bounds[3]],
        [bounds[0], bounds[3]],
        [bounds[0], bounds[1]]
      ],
      0
    );
    return [fromLonLatArray(rect)];
  }

  // build bounds rect style
  buildStyles(feature: Feature): Style[] {
    return [
      new Style({
        stroke: new Stroke({
          color: boundStyles[feature.get(COLOR_INDEX_PROPERTY)],
        }),
        fill: new Fill({
          color: 'rgba(255,255,255,0.0 )' // needed for click
        })
      }),
      new Style({
        geometry:new Point((feature.getGeometry() as Polygon).getCoordinates()[0][3]),
        text: new Text({
          text: feature.get(CHART_PROPERTY)[0] ,
          overflow: true,
          offsetX: 5,
          offsetY: 5,
          fill: new Fill({
            color: boundStyles[feature.get(COLOR_INDEX_PROPERTY)]
          }),
          textAlign: 'left',
          textBaseline: 'top'
        })
      })]
  }
}
