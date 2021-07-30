import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { TileWMS, XYZ} from 'ol/source';
import { Style, Fill, Stroke } from 'ol/style';
import { MapComponent } from '../map.component';
import { osmLayer } from '../util';
import { MapService } from '../map.service';
import { MVT } from 'ol/format';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-charts',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardChartLayerComponent implements OnInit, OnDestroy, OnChanges {

  protected layers: Map<string, any>= new Map();

  @Input() charts: Array<[string,any,boolean]>;
  @Input() zIndex: number= 10;   // start number for zIndex of chart layers

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent,
              private mapService: MapService) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseCharts(this.charts);
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      if(key=='charts' && !changes[key].firstChange) {
        this.parseCharts(changes[key].currentValue);
      }
    }
  }

  ngOnDestroy() {
    this.clearlayers();
  }

  clearlayers() {
    const map = this.mapComponent.getMap();
    if (this.layers && map) {
      this.layers.forEach((l, k)=> map.removeLayer(l));
      map.render();
      this.layers.clear();
    }
  }

  parseCharts(charts: Array<[string,any,boolean]>= this.charts) {
    const map = this.mapComponent.getMap();
    for( const i in charts ) {
      // check for existing layer
      let layer= this.mapService.getLayerByKey('id', charts[i][0]);
      if(!charts[i][2]) { // not selected
        if(layer) { 
          this.mapComponent.getMap().removeLayer(layer);
          this.layers.delete(charts[i][0]);
        }
      } 
      else { // selected 
        if(!layer) {
          if(charts[i][0]=='openstreetmap') { // open street map
            layer= osmLayer();
            layer.setZIndex(this.zIndex + parseInt(i));
            layer.setMinZoom(charts[i][1].minZoom);
            layer.setMaxZoom(charts[i][1].maxZoom);
          }
          else {  // signal k charts
            if(charts[i][1].chartFormat=='pbf' || charts[i][1].chartFormat=='mvt') { // vector tile
              let source = new VectorTileSource({
                url: charts[i][1].tilemapUrl,
                format: new MVT({
                  layers: charts[i][1].chartLayers ? charts[i][1].chartLayers : null
                })
              });
              layer = new VectorTileLayer({
                source: source,
                preload: 0,
                zIndex: this.zIndex + parseInt(i),
                style: this.applyVectorStyle,
                minZoom: charts[i][1].minZoom,
                maxZoom: charts[i][1].maxZoom
              });
            }
            else {  // raster tile
              let source: any;  // select source type
              if(charts[i][1].type=='WMS') {
                source= new TileWMS({
                  url: charts[i][1].tilemapUrl,
                  params: {
                    LAYERS: (charts[i][1].chartLayers) ? charts[i][1].chartLayers.join(',') : ''
                  }
                });
              }
              else {
                source= new XYZ({
                  url: charts[i][1].tilemapUrl
                });
              }
              layer= new TileLayer({
                source: source,
                preload: 0,
                zIndex: this.zIndex + parseInt(i),
                minZoom: charts[i][1].minZoom,
                maxZoom: charts[i][1].maxZoom
              });
            }
          }
          layer.set('id',charts[i][0]);
          this.layers.set(charts[i][0],layer);
          map.addLayer(layer);
        }
      }
    }  
    if(map) { map.render() }
  }

  // apply default vectortile style
  applyVectorStyle(...params:any) {
    return new Style({
      fill: new Fill({
          color: 'rgba(#224, 209, 14, 0.8)'
      }),
      stroke: new Stroke({
          color: '#444',
          width: 1,
      })
    });
  }

}
