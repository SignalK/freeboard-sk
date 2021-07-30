import {
  ChangeDetectionStrategy, ChangeDetectorRef,
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
import { Style, Text, Circle, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { AsyncSubject } from 'rxjs';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointLayerComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() waypoints: {[key:string]: any};
  @Input() waypointStyles: {[key:string]: Style};
  @Input() activeWaypoint: string;
  @Input() labelMinZoom: number= 10;
  @Input() mapZoom: number;
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseWaypoints(this.waypoints);
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
        if(key=='waypoints') {
          this.parseWaypoints(changes[key].currentValue);
          if(this.source) { 
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        }
        else if( key=='waypointStyles') { }
        else if( key=='activeWaypoint') {
          this.parseWaypoints(this.waypoints);
          if(this.source) { 
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        }
        else if( key=='labelMinZoom' || key=='mapZoom') { 
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

  parseWaypoints(waypoints: {[key:string]: any}= this.waypoints) {
    let fa: Feature[]= [];
    for( const w in waypoints ) {
      let f= new Feature({
        geometry: new Point( fromLonLat(waypoints[w].feature.geometry.coordinates) ),
        name: waypoints[w].feature.properties.name
      });
      f.setId('waypoint.'+ w);
      f.setStyle(this.buildStyle(w, waypoints[w]));
      fa.push(f);
    }
    this.features= fa;
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if(key=='labelMinZoom') {
      if(typeof this.mapZoom!=='undefined') { 
        this.updateLabels();
      }
    }
    else if(key=='mapZoom') {
      if(typeof this.labelMinZoom !=='undefined') {
        if( (change.currentValue >= this.labelMinZoom && change.previousValue < this.labelMinZoom) || 
            (change.currentValue < this.labelMinZoom && change.previousValue >= this.labelMinZoom) ) {
          this.updateLabels();
        }
      }
    }
  }

  // build waypoint style
  buildStyle(id:string, wpt:any):Style {
    if(typeof this.waypointStyles!=='undefined') {
      if( id== this.activeWaypoint && typeof this.waypointStyles.active!=='undefined') {
        return this.setTextLabel(this.waypointStyles.active, wpt.feature.properties.name);
      }
      else if( wpt.feature.properties.skType ) {
        return this.setTextLabel(
          this.waypointStyles[wpt.feature.properties.skType], 
          wpt.feature.properties.name
        );
      }
      else {
        return this.setTextLabel(this.waypointStyles.default, wpt.feature.properties.name);
      }
    }
    else if(this.layerProperties && this.layerProperties.style) {
      return this.setTextLabel(this.layerProperties.style, wpt.feature.properties.name);
    }
    else {  // default styles
      let s: Style;
      if(id== this.activeWaypoint) {
        s= new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'blue' }),
            stroke: new Stroke({
              color: 'black',
              width: 2
            })
          }),
          text: new Text({ 
            text: '',
            offsetY: -12
          })
        });
      }
      else {
        s= new Style({
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: 'gold' }),
            stroke: new Stroke({
              color: 'black',
              width: 2
            })
          }),
          text: new Text({ 
            text: '',
            offsetY: -12
          })
        });
      }
      return this.setTextLabel(s, wpt.feature.properties.name);
    }
  }

  // update feature labels
  updateLabels() {
    this.source.getFeatures().forEach( (f:Feature)=> {
      let s:any= f.getStyle();
      f.setStyle( this.setTextLabel(s, f.get('name')) );
    });
  }  

  // return a Style with label text
  setTextLabel(s:Style, text:string): Style {
    let cs= s.clone();
    let ts= cs.getText();
    ts.setText( (Math.abs(this.mapZoom)>= this.labelMinZoom)   ? text : '');
    return cs;
  }

}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardWaypointLayerComponent extends WaypointLayerComponent {

  @Input() waypoints: Array<[string,any,boolean]>;

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    super(changeDetectorRef, mapComponent);
  }

  parseWaypoints(waypoints: Array<[string,any,boolean]>= this.waypoints) {
    let fa: Feature[]= [];
    for( const w of waypoints ) {
      if(w[2]) { // selected
        let f= new Feature({
          geometry: new Point( fromLonLat(w[1].feature.geometry.coordinates) ),
          name: w[1].feature.properties.name
        });
        f.setId('waypoint.'+ w[0]);
        f.setStyle(this.buildStyle(w[0], w[1]));
        fa.push(f);
      }
    }
    this.features= fa;
  }

}
