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
import { Style, Stroke } from 'ol/style';
import { MultiLineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';

// ** Signal K target tracks  **
@Component({
  selector: 'ol-map > sk-target-tracks',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SKTargetTracksLayerComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() tracks: Map<string, any>= new Map();
  @Input() minZoom: number= 10;
  @Input() mapZoom: number;
  @Input() showTracks: boolean= true;
  @Input() updateIds: Array<string>= [];
  @Input() removeIds: Array<string>= [];
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
    this.source = new VectorSource();
    this.layer = new VectorLayer(Object.assign(this, {...this.layerProperties}));
    this.parseItems( this.extractKeys(this.tracks) );

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
        if(key=='tracks' && changes[key].firstChange) {
          if(!changes[key].currentValue) { return }
          if(!this.source) { return }
          this.source.clear();
          this.parseItems(this.extractKeys(changes[key].currentValue)); 
        }
        else if(key=='updateIds') { 
          this.parseItems(changes[key].currentValue);
        }
        else if(key=='removeIds') { 
          this.removeItems(changes[key].currentValue);
        }
        else if(key=='showTracks' && !changes[key].firstChange) { 
          if(changes[key].currentValue) {
            this.parseItems(this.extractKeys(this.tracks));
          }
          else { this.source.clear() }
        }
        else if(key=='labelMinZoom' || key=='mapZoom') { 
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
        this.parseItems( this.extractKeys(this.tracks) );
      }
    }
    else if(key=='mapZoom') {
      if(typeof this.minZoom !=='undefined') {
        if( (change.currentValue >= this.minZoom && change.previousValue < this.minZoom) || 
            (change.currentValue < this.minZoom && change.previousValue >= this.minZoom) ) {
          this.parseItems( this.extractKeys(this.tracks) );
        }
      }
    }
  }

  extractKeys(m:Map<string,any>): Array<string> {
    let keys= [];
    m.forEach((v,k)=> { keys.push(k) });
    return keys;
  }

  // add update features
  parseItems(ids: Array<string>) {
    if(!ids || !Array.isArray(ids) ) { return }
    if(!this.source) { return }
    ids.forEach( w => {
      if(this.tracks.has(w)) { 
        let target= this.tracks.get(w);
        // ** target **
        let f= this.source.getFeatureById('track-' + w); 
        if(f) { // exists so update it
          f.setGeometry( new MultiLineString( this.parseCoordinates(target) ) );
          f.setStyle(this.buildStyle(w));
        }
        else {  // does not exist so create it
          f= new Feature( { 
            geometry: new MultiLineString( this.parseCoordinates(target) )
          });
          f.setId('track-' + w);
          f.setStyle(this.buildStyle(w));
          this.source.addFeature(f);
        } 
      }
    });
  }

  // remove features
  removeItems(ids:Array<string>) {
    if(!ids || !Array.isArray(ids) ) { return }
    if(!this.source) { return }
    ids.forEach( w=> { 
      let f= this.source.getFeatureById('track-' + w);
      if(f) { this.source.removeFeature(f) }
    });   
  }   


  // build target style
  buildStyle(id:string):Style {
    let rgb= (id.indexOf('aircraft')!=-1) ?  '0, 0, 255' : '255, 0, 255';
    let color= (this.mapZoom < this.minZoom) ? `rgba(${rgb},0)` : `rgba(${rgb},1)`;
    color= (this.showTracks) ? `rgba(${rgb},1)` : `rgba(${rgb},0)`;
    if(this.layerProperties && this.layerProperties.style) { 
      let cs= this.layerProperties.style.clone();
      let ls= cs.getStroke();
      ls.setColor(color);
      cs.setStroke(ls);
      return cs;
    }
    else {
      return new Style({                    
        stroke: new Stroke({
            width: 1,
            color: color,
            lineDash: [2,2]
        })
      });
    }
  
  }

  // ** mapify and transform MultiLineString coordinates
  parseCoordinates(trk:Array<any>) {
    // ** handle dateline crossing **
    let tc= trk.map( mls=> {
        let lines:Array<any>= [];
        mls.forEach( line=> lines.push( mapifyCoords(line) ) )
        return lines;
    });
    return fromLonLatArray(tc);
  }

}

