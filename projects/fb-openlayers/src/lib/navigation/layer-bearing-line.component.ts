import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges, SimpleChange
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { StyleLike } from 'ol/style/Style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords, mapifyRadius } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Bearing line component **
@Component({
  selector: 'ol-map > fb-bearing-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BearingLineComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>= [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() marker: Coordinate;
  @Input() markerName: string;
	@Input() lineCoords: Array<Coordinate>;
  @Input() showMarker: boolean= false;
  @Input() mapZoom: number= 10;
  @Input() labelMinZoom: number= 10;
  @Input() bearingStyles: { [key:string]: any };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };


  public mapifiedRadius: number= 0;
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
        
        if(key=='marker' || key=='showMarker' || key=='lineCoords') {
          this.parseValues();
          if(this.source) { 
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        }
        else if( key=='markerName' || key=='labelMinZoom' || key=='mapZoom') { 
          this.handleLabelZoomChange(key, changes[key]);
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
    f.setStyle(this.buildStyle('base'));
    fa.push(f);
    f= new Feature({
      geometry: new LineString( fromLonLatArray(this.mapifiedLine) )
    });
    f.setStyle(this.buildStyle('line'));
    fa.push(f);
    f= new Feature({
      geometry: new Point( fromLonLat(this.marker) )
    });
    f.setId('d.base');
    f.setStyle(this.buildStyle('marker-base'));
    this.updateLabel(f);
    fa.push(f);
    if(this.showMarker) {
      f= new Feature({
        geometry: new Point( fromLonLat(this.marker) )
      });
      f.setId('dest.point');
      f.setStyle(this.buildStyle('marker'));
      fa.push(f);
    }

    this.features= fa;
  }

  // build target style
  buildStyle(key: string):Style {
    if(this.bearingStyles && this.bearingStyles[key]) {
      return this.bearingStyles[key];
    }
    else {
      if(this.layerProperties && this.layerProperties.style) { 
        return this.layerProperties.style 
      }
      else { // default style
        if(key=='base') {
          return new Style({                    
            stroke: new Stroke({
                width: 6,
                color: 'white'
            }),
            fill: new Fill({
              color: 'white'
            }),
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 2,
                color: 'white'
              }),
              fill: new Fill({
                color: 'rgba(221, 149, 0, 1)'
              })
            })
          });
        }
        else if(key=='marker-base') {
          return new Style({    
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 2,
                color: 'white'
              }),
              fill: new Fill({
                color: 'rgba(221, 149, 0, 1)'
              })
            }),
            text: new Text({
              text: '',
              offsetX: 25
            })
          })
        }
        else {
          return new Style({                    
            stroke: new Stroke({
                width: 2,
                color: 'rgba(221, 149, 0, 1)'
            }),
            fill: new Fill({
              color: 'rgba(221, 149, 0, 1)'
            })
          });
        }
      }
    }
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if(key=='labelMinZoom') {
      if(typeof this.mapZoom!=='undefined') { 
        this.updateLabel();
      }
    }
    else if(key=='mapZoom') {
      if(typeof this.labelMinZoom !=='undefined') {
        if( (change.currentValue >= this.labelMinZoom && change.previousValue < this.labelMinZoom) || 
            (change.currentValue < this.labelMinZoom && change.previousValue >= this.labelMinZoom) ) {
          this.updateLabel();
        }
      }
    }
  }

  // update feature labels
  updateLabel(f?: Feature) {
    if(!f && this.source) {
      f= this.source.getFeatureById('d.base'); 
    }
    let s:StyleLike= f.getStyle();
    if(!s) { return }
    let ts= (s as Style).getText();
    if(!ts) { return }
    ts.setText( (Math.abs(this.mapZoom)>= this.labelMinZoom) ? this.markerName ?? '' : '' );
    (s as Style).setText(ts);
    f.setStyle( s );
  }

}
