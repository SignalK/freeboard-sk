import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import { TileWMS, XYZ, TileJSON, WMTS } from 'ol/source';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';

import { MapComponent } from '../map.component';
import { osmLayer } from '../util';
import { MapService } from '../map.service';
import { VectorLayerStyleFactory } from '../vectorLayerStyleFactory';

import DataTile from 'ol/source/DataTile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import VectorTileLayer from 'ol/layer/VectorTile';
import * as pmtiles from 'pmtiles';
import { SKChart } from 'src/app/modules';
import LayerGroup from 'ol/layer/Group';
import { apply } from 'ol-mapbox-style';
import { FeatureLike } from 'ol/Feature';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-charts',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardChartLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected layers: Map<string, any> = new Map();

  @Input() charts: Array<[string, SKChart, boolean]>;
  @Input() zIndex = 10; // start number for zIndex of chart layers

  private wmtsCapabilitesMap = new Map();

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent,
    private mapService: MapService,
    private vectorLayerStyleFactory: VectorLayerStyleFactory
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseCharts(this.charts);
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      if (key === 'charts' && !changes[key].firstChange) {
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

  // create a PMTile WebGLtile layer
  initPMTilesWebGLLayer(
    url: string,
    minZoom: number,
    maxZoom: number,
    zIndex: number
  ): WebGLTileLayer {
    const tiles = new pmtiles.PMTiles(url);

    function loadImage(src: string) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', () => reject(new Error('load failed')));
        img.src = src;
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function loader(z, x, y): Promise<any> {
      const response = await tiles.getZxy(z, x, y);
      const blob = new Blob([response.data]);
      const src = URL.createObjectURL(blob);
      const image = await loadImage(src);
      URL.revokeObjectURL(src);
      return image;
    }

    return new WebGLTileLayer({
      source: new DataTile({
        loader,
        wrapX: true,
        maxZoom: maxZoom,
        minZoom: minZoom
      }),
      style: {},
      zIndex: zIndex
    });
  }

  // create a PMTile XYZ source TileLayer
  initPMTilesXYZLayer(
    url: string,
    minZoom: number,
    maxZoom: number,
    zIndex: number
  ): TileLayer<XYZ> {
    const tiles = new pmtiles.PMTiles(url);

    function loader(tile, url) {
      tile.setState(1); // LOADING
      // the URL construction is done internally by OL, so we need to parse it
      // back out here using a hacky regex
      const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
      const result = url.match(re);
      const z = +result[2];
      const x = +result[3];
      const y = +result[4];

      tiles.getZxy(z, x, y).then((tile_result) => {
        if (tile_result) {
          const blob = new Blob([tile_result.data]);
          const imageUrl = window.URL.createObjectURL(blob);
          tile.getImage().src = imageUrl;
          tile.setState(2); // LOADED
        } else {
          tile.setState(4); // EMPTY
        }
      });
    }

    return new TileLayer({
      source: new XYZ({
        tileLoadFunction: loader,
        tileSize: [512, 512],
        url: 'pmtiles://' + url + '/{z}/{x}/{y}',
        wrapX: true,
        maxZoom: maxZoom,
        minZoom: minZoom
      }),
      zIndex: zIndex
    });
  }

  async parseCharts(charts: Array<[string, SKChart, boolean]> = this.charts) {
    const map = this.mapComponent.getMap();

    for (const i in charts) {
      // check for existing layer
      let layer = this.mapService.getLayerByKey('id', charts[i][0]);
      if (!charts[i][2]) {
        // not selected
        if (layer) {
          map.removeLayer(layer);
          this.layers.delete(charts[i][0]);
        }
      } else {
        // selected
        if (!layer) {
          if (charts[i][0] === 'openstreetmap') {
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

            if (charts[i][1].type.toLowerCase() === 'mapboxstyle') {
              const lg = new LayerGroup({
                zIndex: this.zIndex + parseInt(i)
              });
              lg.set('id', charts[i][0]);
              apply(lg, `${charts[i][1].url}`);
              map.addLayer(lg);
            } else if (
              charts[i][1].format === 'pbf' ||
              charts[i][1].format === 'mvt'
            ) {
              const styleFactory =
                this.vectorLayerStyleFactory.CreateVectorLayerStyler(
                  charts[i][1]
                );
              layer = styleFactory.CreateLayer();
              styleFactory.ApplyStyle(layer as VectorTileLayer<never>);
              layer.setZIndex(this.zIndex + parseInt(i));
            } else {
              // raster tile
              let source; // select source type
              if (
                charts[i][1].type &&
                charts[i][1].type.toLowerCase() === 'wms'
              ) {
                // WMS source
                source = new TileWMS({
                  url: charts[i][1].url,
                  params: {
                    LAYERS: charts[i][1].layers
                      ? charts[i][1].layers.join(',')
                      : ''
                  }
                });
              } else if (
                charts[i][1].type &&
                charts[i][1].type.toLowerCase() === 'wmts'
              ) {
                // WMTS - fetch GetCapabilities.xml
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let result: any;
                if (!this.wmtsCapabilitesMap.has(charts[i][1].url)) {
                  try {
                    const response = await fetch(
                      `${charts[i][1].url}?request=GetCapabilities&service=wmts`
                    );
                    const capabilitiesXml = await response.text();
                    if (!capabilitiesXml) {
                      console.log('Error: GetCapabilities response is empty!');
                      return;
                    }
                    const parser = new WMTSCapabilities();
                    result = parser.read(capabilitiesXml);
                    this.wmtsCapabilitesMap.set(charts[i][1].url, result);
                  } catch (err) {
                    console.log(err);
                    return;
                  }
                } else {
                  // get pre-fetched capabilities
                  result = this.wmtsCapabilitesMap.get(charts[i][1].url);
                }

                const options = optionsFromCapabilities(result, {
                  layer: charts[i][1].layers[0],
                  matrixSet: 'EPSG:3857'
                });
                source = new WMTS(options);
              } else if (
                charts[i][1].type &&
                charts[i][1].type.toLowerCase() === 'tilejson'
              ) {
                // tileJSON
                source = new TileJSON({
                  url: charts[i][1].url,
                  crossOrigin: 'anonymous'
                });
              } else {
                // XYZ tilelayer
                if (charts[i][1].url.indexOf('.pmtiles') !== -1) {
                  // pmtiles source
                  layer = this.initPMTilesXYZLayer(
                    charts[i][1].url,
                    charts[i][1].minZoom,
                    charts[i][1].maxZoom,
                    this.zIndex + parseInt(i)
                  );
                } else {
                  // default XYZ source
                  source = new XYZ({
                    url: charts[i][1].url
                  });
                }
              }

              if (source) {
                layer = new TileLayer({
                  source: source,
                  preload: 0,
                  zIndex: this.zIndex + parseInt(i),
                  minZoom: minZ,
                  maxZoom: maxZ
                });
              }
            }
          }
          if (layer) {
            layer.set('id', charts[i][0]);
            this.layers.set(charts[i][0], layer);
            map.addLayer(layer);
          }
        } else {
          // set zIndex
          layer.setZIndex(this.zIndex + parseInt(i));
        }
      }
    }
    if (map) {
      map.render();
    }
  }
}
