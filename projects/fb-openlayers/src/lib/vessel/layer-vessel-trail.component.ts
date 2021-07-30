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
import { Style, Fill, Stroke } from 'ol/style';
import { Geometry, MultiLineString, LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';


// ** Freeboard Vessel trail component **
@Component({
  selector: 'ol-map > fb-vessel-trail',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselTrailComponent implements OnInit, OnDestroy, OnChanges {

  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed


  @Input() localTrail: Array<Coordinate>;
  @Input() serverTrail: Array<Array<Coordinate>>;
  @Input() trailStyles: { [key: string]: Style };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  @Input() layerProperties: { [index: string]: any };

  trailLocal: Feature;
  trailServer: Feature;

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    let fa= []
    this.parseTrails();
    if(this.trailLocal) { fa.push(this.trailLocal) }
    if(this.trailServer) { fa.push(this.trailServer) }
    this.source = new VectorSource({features: fa });
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
        if(key=='localTrail') {
          if(this.source) { 
            this.parseLocalTrail();
          }
        }
        if(key=='serverTrail') {
          if(this.source) { 
            this.parseServerTrail();
          }
        }
        if(key=='trailStyles') {
          if(this.source) { 
            this.parseTrails();
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

  parseTrails() {
    this.parseLocalTrail();
    this.parseServerTrail();
  }

  parseLocalTrail() {
    if(!this.localTrail) { return }
    let c= fromLonLatArray(this.localTrail);
    if(!this.trailLocal) { // create feature
      this.trailLocal= new Feature( new LineString( mapifyCoords(c) ) );
      this.trailLocal.setId('trail.self.local');
      this.trailLocal.setStyle(this.buildStyle('local'));
    }
    else { //update feature
      this.trailLocal= this.source.getFeatureById('trail.self.local');
      if(this.localTrail && Array.isArray(this.localTrail)) {
        let g:Geometry= this.trailLocal.getGeometry();
        (g as LineString).setCoordinates( mapifyCoords(c) );
      }
    }
  }

  parseServerTrail() {
    if(!this.serverTrail) { return }
    let c= fromLonLatArray(this.serverTrail);
    let ca= [];
    c.forEach( (t:Array<Coordinate>)=> { ca.push(mapifyCoords(t)) });
    if(!this.trailServer) { // create feature
      this.trailServer= new Feature( new MultiLineString( ca ) );
      this.trailServer.setId('trail.self.server');
      this.trailServer.setStyle(this.buildStyle('server'));
    }
    else { //update feature
      this.trailServer= this.source.getFeatureById('trail.self.server');
      if(this.serverTrail && Array.isArray(this.serverTrail)) {
        let g:Geometry= this.trailServer.getGeometry();
        (g as MultiLineString).setCoordinates(ca);
      }
    }
  }  

  // build target style
  buildStyle(type:string= 'local'):Style {
    let cs: Style;
    if( type=='server') {
      if(this.trailStyles && this.trailStyles.server) { 
        cs= this.trailStyles.server;
      }
      else {
        cs= new Style({ // default server                
          stroke: new Stroke({
            color: 'rgb(252, 3, 132)',
            width: 1,
            lineDash: [4,4]
          })
        });
      }
    }
    else {
      if(this.trailStyles && this.trailStyles.local) { 
        cs= this.trailStyles.local;
      }
      else {
        cs= new Style({ // default local                
          stroke: new Stroke({
            color: 'rgb(252, 3, 132)',
            width: 1,
            lineDash: [2,2]
          })
        });
      }
    }
    return cs
  }

}
