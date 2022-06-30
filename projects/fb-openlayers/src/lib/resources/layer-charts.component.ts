import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { TileWMS, XYZ, TileJSON, WMTS } from 'ol/source';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { Style, Fill, Stroke } from 'ol/style';
import { MapComponent } from '../map.component';
import { osmLayer } from '../util';
import { MapService } from '../map.service';
import { MVT } from 'ol/format';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-charts',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeboardChartLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  protected layers: Map<string, any> = new Map();

  @Input() charts: Array<[string, any, boolean]>;
  @Input() zIndex = 10; // start number for zIndex of chart layers

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent,
    private mapService: MapService
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseCharts(this.charts);
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      if (key == 'charts' && !changes[key].firstChange) {
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
      this.layers.forEach((l) => map.removeLayer(l));
      map.render();
      this.layers.clear();
    }
  }

  parseCharts(charts: Array<[string, any, boolean]> = this.charts) {
    const map = this.mapComponent.getMap();
    for (const i in charts) {
      // check for existing layer
      let layer = this.mapService.getLayerByKey('id', charts[i][0]);
      if (!charts[i][2]) {
        // not selected
        if (layer) {
          this.mapComponent.getMap().removeLayer(layer);
          this.layers.delete(charts[i][0]);
        }
      } else {
        // selected
        if (!layer) {
          if (charts[i][0] == 'openstreetmap') {
            // open street map
            layer = osmLayer();
            layer.setZIndex(this.zIndex + parseInt(i));
            layer.setMinZoom(charts[i][1].minZoom);
            layer.setMaxZoom(charts[i][1].maxZoom);
          } else {
            // signal k charts
            const minZ =
            charts[i][1].minZoom && charts[i][1].minZoom >= 0.1
                ? charts[i][1].minZoom - 0.1
                : charts[i][1].minZoom;
            const maxZ = charts[i][1].maxZoom;
            if (
              charts[i][1].format == 'pbf' ||
              charts[i][1].format == 'mvt'
            ) {
              // vector tile
              const source = new VectorTileSource({
                url: charts[i][1].url,
                format: new MVT({
                  layers: charts[i][1].layers && charts[i][1].layers.length !==0
                    ? charts[i][1].layers
                    : null,
                }),
              });
              layer = new VectorTileLayer({
                source: source,
                preload: 0,
                zIndex: this.zIndex + parseInt(i),
                style: this.applyVectorStyle,
                minZoom: minZ,
                maxZoom: maxZ,
              });
            } 
            else {
              // raster tile
              let source; // select source type
              if (charts[i][1].type && charts[i][1].type.toLowerCase() === 'wms') { // WMS source
                source = new TileWMS({
                  url: charts[i][1].url,
                  params: {
                    LAYERS: charts[i][1].layers
                      ? charts[i][1].layers.join(',')
                      : '',
                  },
                });
              } else if (charts[i][1].type && charts[i][1].type.toLowerCase() === 'wmts') {
                // fetch WMTS GetCapabilities.xml
                fetch(charts[i][1].url)
                .then((response) => {
                  return response.text();
                })
                .then( (capabilitiesXml) => {
                  if (!capabilitiesXml) { return }
                  const parser = new WMTSCapabilities();
                  const result = parser.read(capabilitiesXml);
                  const options = optionsFromCapabilities(result, {
                    layer: charts[i][1].layers[0],
                    matrixSet: 'EPSG:3857',
                  });
                  source = new WMTS(options);
                  layer = new TileLayer({
                    source: source,
                    preload: 0,
                    zIndex: this.zIndex + parseInt(i),
                    minZoom: minZ,
                    maxZoom: maxZ,
                  });
                  layer.set('id', charts[i][0]);
                  this.layers.set(charts[i][0], layer);
                  map.addLayer(layer);
                });
              } else if (charts[i][1].type && charts[i][1].type.toLowerCase() === 'tilejson') {
                  source = new TileJSON({
                    url: charts[i][1].url,
                  });
              } else {    // default XYZ source
                source = new XYZ({
                  url: charts[i][1].url,
                });
              }

              if (source) {
                layer = new TileLayer({
                  source: source,
                  preload: 0,
                  zIndex: this.zIndex + parseInt(i),
                  minZoom: minZ,
                  maxZoom: maxZ,
                });
              }
            }
          }
          if (layer) {
            layer.set('id', charts[i][0]);
            this.layers.set(charts[i][0], layer);
            map.addLayer(layer);
          }
        }
      }
    }
    if (map) {
      map.render();
    }
  }

  // apply default vectortile style
  applyVectorStyle(...params: any) {
    return new Style({
      fill: new Fill({
        color: 'rgba(#224, 209, 14, 0.8)',
      }),
      stroke: new Stroke({
        color: '#444',
        width: 1,
      }),
    });
  }
}
