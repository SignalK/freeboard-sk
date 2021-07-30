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
import { Style, RegularShape, Fill, Stroke } from 'ol/style';
import { Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { destCoordinate } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Signal K Other Vessels  **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SKVesselsLayerComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;
  protected targetType: string= 'vessel';

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() targets: Map<string, any>= new Map();
  @Input() targetStyles: {[key:string]: Style};
  @Input() focusId: string;
  @Input() inactiveTime: number= 180000;  // in ms (3 mins)
  @Input() labelMinZoom: number= 10;
  @Input() mapZoom: number;
  @Input() showVector: boolean= true;
  @Input() vectorMinZoom: number= 15;
  @Input() vectorApparent: boolean= false;
  @Input() filterIds: Array<string>;
  @Input() updateIds: Array<string>= [];
  @Input() staleIds: Array<string>= [];
  @Input() removeIds: Array<string>= [];
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };

  protected zoomOffsetLevel=[
    1,1000000,550000,290000,140000,70000,
    38000,17000,7600,3900,1900,
    950,470,250,120,60,
    30,15.5,8.1,4,2,
    1,.5,.25,.12,.06,
    .03,.015,.008,1
  ];

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource();
    this.layer = new VectorLayer(Object.assign(this, {...this.layerProperties}));
    this.parseItems( this.extractKeys(this.targets) );

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
        if(key=='targets' && changes[key].firstChange) {
          if(!changes[key].currentValue) { return }
          if(!this.source) { return }
          this.source.clear();
          this.parseItems(this.extractKeys(changes[key].currentValue)); 
        }
        else if(key=='updateIds') { 
          this.parseItems(changes[key].currentValue);
        }
        else if(key=='staleIds') { 
          this.parseItems(changes[key].currentValue, true);
        }
        else if(key=='removeIds') { 
          this.removeItems(changes[key].currentValue);
        }
        else if(key=='inactiveTime') { 
          this.parseItems(this.extractKeys(this.targets));
        }
        else if(key=='focusId' || key=='filterIds' || key=='vectorApparent') { 
          this.parseItems(this.extractKeys(this.targets));
        }
        else if(key=='targetStyles' && !changes[key].firstChange) { 
          this.parseItems(this.extractKeys(this.targets));
        }
        else if(key=='labelMinZoom' || key=='mapZoom' || key=='vectorMinZoom') { 
          this.handleLabelZoomChange(key, changes[key]);
        }
        else if(key=='layerProperties') { 
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

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if(key=='labelMinZoom') {
      if(typeof this.mapZoom!=='undefined') { 
        this.updateLabels();
      }
    }
    else if(key=='vectorMinZoom') {
      if(typeof this.mapZoom!=='undefined') { 
        this.targets.forEach( (v,k)=> {this.parseWindVector(k, v)} );
      }
    }
    else if(key=='mapZoom') {
      if(typeof this.labelMinZoom !=='undefined') {
        if( (change.currentValue >= this.labelMinZoom && change.previousValue < this.labelMinZoom) || 
            (change.currentValue < this.labelMinZoom && change.previousValue >= this.labelMinZoom) ) {
          this.updateLabels();
        }
      }
      if(typeof this.vectorMinZoom !=='undefined') {
        if( (change.currentValue >= this.vectorMinZoom && change.previousValue < this.vectorMinZoom) || 
            (change.currentValue < this.vectorMinZoom && change.previousValue >= this.vectorMinZoom) ) {
          this.targets.forEach( (v,k)=> {this.parseWindVector(k, v)} );
        }
      }
    }
  }

  extractKeys(m:Map<string,any>): Array<string> {
    let keys= [];
    m.forEach((v,k)=> { 
      if(k.indexOf(this.targetType)!=-1) {
        keys.push(k);
      }
    });
    return keys;
  }

  // returns true if item should be rendered
  okToRender(id: string, vector?: boolean): boolean {
    if(vector && !this.showVector) { return false }
    if(!this.filterIds) { return true } 
    if(Array.isArray(this.filterIds)) {
      return this.filterIds.includes(id);
    }
    else { return true }
  }

  // add update features
  parseItems(ids: Array<string>, stale:boolean=false) {
    if(!ids || !Array.isArray(ids) ) { return }
    if(!this.source) { return }
    ids.forEach( w => {
      if(w.indexOf('vessel')==-1) { return }
      if(this.targets.has(w)) { 
        let target= this.targets.get(w);
        // ** target **
        let f= this.source.getFeatureById('ais-'+ w); 
        if(f) { // exists so update it
          if(this.okToRender(w) && target.position) {
              f.setGeometry( new Point( fromLonLat(target.position) ) );
              f.setStyle(this.buildTargetStyle(w, target, stale));
          }
          else { this.source.removeFeature(f) }
        }
        else {  // does not exist so create it
          if(this.okToRender(w) && target.position) {
              f= new Feature( { 
                geometry: new Point( fromLonLat(target.position) ),
                name: target.name
              });
              f.setId('ais-'+ w);
              f.setStyle(this.buildTargetStyle(w, target, stale));
              this.source.addFeature(f);
          }
        } 
        this.parseWindVector(w, target);
      }
    });
  }

  // add update Wind vector
  parseWindVector(id:string, target: any) {
    if(!this.source) { return }
    if(!target.wind || typeof target.orientation==='undefined'){ return }
    let windDirection= (this.vectorApparent) ? 
      (typeof target.wind.awa!=='undefined') ? target.orientation + target.wind.awa : null 
      : target.wind.direction; 
    if(typeof windDirection!=='number') { return }

    let wf=this.source.getFeatureById('wind-'+ id);
    if(!this.okToRender(id, true) || !target.position) { 
      if(wf) { this.source.removeFeature(wf) }
      return;
    }

    let windc= destCoordinate( target.position, windDirection, this.zoomOffsetLevel[this.mapZoom]);
    if(wf) { // update vector
      wf.setGeometry( new LineString( [
          fromLonLat(target.position),
          fromLonLat(windc)
      ]) );
      wf.setStyle( this.buildVectorStyle(id) ); 
    }
    else { // create vector
      wf= new Feature( new LineString( [
          fromLonLat(target.position),
          fromLonLat(windc)
      ]) );
      wf.setId('wind-'+ id);
      wf.setStyle( this.buildVectorStyle(id) );
      this.source.addFeature(wf);
    }
  }

  // remove features
  removeItems(ids:Array<string>) {
    if(!ids || !Array.isArray(ids) ) { return }
    if(!this.source) { return }
    ids.forEach( w=> { 
        let f= this.source.getFeatureById('ais-'+ w);
        if(f) { this.source.removeFeature(f) }
        f= this.source.getFeatureById('wind-' + w);
        if(f) { this.source.removeFeature(f) }
    });   
}   

  // build target style
  buildTargetStyle(id: string, item: any, setStale:boolean=false):Style {
    let s: Style;
    let lbl= item.name ?? item.callsign ?? item.mmsi ?? '';

    // ** stale check time ref 
    let now= new Date().valueOf();
    if(typeof this.targetStyles!=='undefined') {
      if(id==this.focusId && this.targetStyles.focus) { 
        s= this.targetStyles.focus;
      }
      else if ( setStale || (item.lastUpdated as any)< (now-this.inactiveTime) ) { // stale
        s= this.targetStyles.inactive;
      } 
      else if(item.buddy && this.targetStyles.buddy) { 
        s= this.targetStyles.buddy; 
      }
      else { 
        s= this.targetStyles.default;
      }
    }
    else if(this.layerProperties && this.layerProperties.style){ 
      s= this.layerProperties.style 
    }
    else { 
      if(id==this.focusId) {
        s= new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
      else if ( setStale || (item.lastUpdated as any)< (now-this.inactiveTime) ) {
        s= new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
      else {
        s= new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'magenta' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
    }
    s= this.setRotation(
      this.setTextLabel( s, lbl ),
      item.orientation
    );
    return s;
  }

  // build wind vector style
  buildVectorStyle(id: any):Style {
    let color= (this.vectorApparent) ? '16, 75, 16' : '128, 128, 0';
    let opacity= this.okToRender(id) ? 1 : 0;
    opacity&= (this.mapZoom<this.vectorMinZoom) ? 0 : 1;
    return new Style({                    
      stroke: new Stroke({
          width: 2,
          color: `rgba(${color},${opacity})`
      }),
    });
  }

  // update feature labels
  updateLabels() {
    this.source.getFeatures().forEach( (f:Feature)=> {
      let id= f.getId();
      if( (id as string).indexOf('ais-')!=-1) {
        let s:any= f.getStyle();
        f.setStyle( this.setTextLabel(s, f.get('name')) );
      }
    });
  }  

  // return a Style with label text set
  setTextLabel(s:Style, text:string):Style {
    if(!s) { return s }
    let cs= s.clone();
    let ts= cs.getText();
    if(ts){
      ts.setText((Math.abs(this.mapZoom)>= this.labelMinZoom) ? text : '');
      cs.setText(ts);
    }
    return cs;
  }

  // return a Style with rotation set
  setRotation(s:Style, value:number):Style {
    if(!s) { return s }
    let cs= s.clone();
    let im= cs.getImage();
    if(im) {
      im.setRotation(value ?? 0);
      cs.setImage( im );
    }
    return cs;
  }

}

