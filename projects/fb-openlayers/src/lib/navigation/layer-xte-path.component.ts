import {
  ChangeDetectionStrategy, ChangeDetectorRef,
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
import { Style, Stroke, Fill } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';


// ** Freeboard XTE path component **
@Component({
  selector: 'ol-map > fb-xte-path',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XTEPathComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() color: string;
	@Input() lineCoords: Array<Coordinate>;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };


  public mapifiedLine: Array<Coordinate>= [];
  
  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseValues();
    this.source = new VectorSource({features: this.features});
    this.layer = new VectorLayer(Object.assign(this, {...this.layerProperties}));

    const map = this.mapComponent.getMap();
    if(this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }

  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.layer) {
      const properties: { [index: string]: any } = {};

      for(const key in changes) {
        if(key=='color' || key=='lineCoords') {
          this.parseValues();
          if(this.source) { 
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        }
        else if( key=='layerProperties') { 
          this.layer.setProperties(properties, false);
        }
        else {
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

  parseValues() {
    this.mapifiedLine= mapifyCoords(this.lineCoords);
    let fa: Feature[]= [];
    let f= new Feature({
      geometry: new LineString( fromLonLatArray(this.mapifiedLine) )
    });
    f.setStyle(this.buildStyle());
    fa.push(f);
    this.features= fa;
  }

  // build target style
  buildStyle():Style {
    let cs: Style;
    if(this.layerProperties && this.layerProperties.style) { 
      cs= this.layerProperties.style 
    }
    else { // default style
      let color= this.color ?? 'gray';
      cs= new Style({                   
        stroke: new Stroke({
            width: 1,
            color: color,
            lineDash: [5,5]
        }),
        fill: new Fill({
          color: 'rgba(255,0,0,.2)'
        })
      });
    }
    return cs
  }

}
