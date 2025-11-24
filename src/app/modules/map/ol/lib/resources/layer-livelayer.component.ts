import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  input,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import { TileWMS, WMTS, XYZ } from 'ol/source';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';

import { MapComponent } from '../map.component';
import { FBInfoLayer, FBInfoLayers } from 'src/app/types';
import { SKInfoLayer } from 'src/app/modules/skresources';

import LayerGroup from 'ol/layer/Group';
import BaseLayer from 'ol/layer/Base';
import { Collection } from 'ol';

interface LiveLayer {
  layer: TileLayer;
  lastRefresh: number;
  infoLayer: SKInfoLayer;
}

// ** Freeboard InfoLayer (live layer) **
@Component({
  selector: 'ol-map > fb-livelayer',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardLiveLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() layerDefs: FBInfoLayers;
  @Input() zIndex = 100; // start number for layer zIndex

  public params = input<Array<{ id: string; param: { [key: string]: any } }>>();

  protected layerGroup: LayerGroup;
  private wmtsCapabilitesMap = new Map();
  private layerMap: Map<string, LiveLayer> = new Map();
  private refreshTimer: any;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    this.refreshTimer = setInterval(() => this.onTimerTick(), 60000);

    effect(() => {
      if (!this.layerMap || !Array.isArray(this.params())) return;
      this.params().forEach((p) => {
        const v = this.layerMap.get(p.id);
        // update source params
        const src = v.layer.getSource();
        if (src && v.infoLayer.values.sourceType.toLowerCase() === 'wms') {
          (src as TileWMS)?.updateParams(p.param);
        } else if (
          src &&
          v.infoLayer.values.sourceType.toLowerCase() === 'wmts'
        ) {
          (src as WMTS)?.updateDimensions(p.param);
        }
      });
    });
  }

  ngOnInit() {
    this.parseLayers(this.layerDefs);
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      if (key === 'layerDefs' && !changes[key].firstChange) {
        this.parseLayers(changes[key].currentValue);
      }
    }
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
    this.clearlayers();
  }

  /** Process Refresh Timer tick */
  private onTimerTick() {
    const n = Date.now();
    //console.log('InfoLayer timer tick...', n);
    this.layerMap.forEach((v, k) => {
      //console.log(k, v.infoLayer.values.refreshInterval, v.lastRefresh, n - v.lastRefresh)
      if (
        v.infoLayer.values?.refreshInterval > 0 &&
        n - v.lastRefresh >= v.infoLayer.values?.refreshInterval
      ) {
        // refresh layer source
        const src = v.layer.getSource();
        src?.refresh();
        v.lastRefresh = n;
      }
    });
  }

  private clearlayers() {
    const map = this.mapComponent.getMap();
    if (this.layerGroup && map) {
      map.removeLayer(this.layerGroup);
    }
  }

  /** Process changes in layerDefs array */
  private async parseLayers(ld: FBInfoLayers = this.layerDefs) {
    const map = this.mapComponent.getMap();
    if (!map) return;
    if (!this.layerGroup) {
      this.layerGroup = new LayerGroup({
        zIndex: this.zIndex
      });
      this.layerGroup.set('id', 'infogroup');
      map.addLayer(this.layerGroup);
    }

    const lc: Collection<BaseLayer> = new Collection();
    const ids = [];
    for (const i in ld) {
      const l = ld[i];
      ids.push(l[0]);
      if (!this.layerMap.has(l[0])) {
        // add layer
        const layer = await this.buildLayer(l, i);
        if (layer) {
          this.layerMap.set(l[0], {
            layer: layer,
            lastRefresh: Date.now(),
            infoLayer: l[1]
          });
          lc.push(layer);
        }
      } else {
        // update layer
        const layer = this.layerMap.get(l[0]).layer;

        if (layer.getOpacity() !== (l[1].values?.opacity ?? 1)) {
          layer.setOpacity(l[1].values?.opacity ?? 1);
        }
        if (layer.getMinZoom() !== (l[1].values?.minZoom ?? 1)) {
          layer.setMinZoom(l[1].values?.minZoom ?? 1);
        }
        if (layer.getMaxZoom() !== (l[1].values?.maxZoom ?? 24)) {
          layer.setMaxZoom(l[1].values?.maxZoom ?? 24);
        }
        this.layerMap.set(l[0], {
          layer: layer,
          lastRefresh: Date.now(),
          infoLayer: l[1]
        });
        lc.push(layer);
      }
    }
    this.layerGroup.setLayers(lc);
    map.render();
    // clean-up layerMap
    const ar = Array.from(this.layerMap).map((i) => i[0]);
    ar.forEach((arid) => {
      if (!ids.includes(arid)) {
        this.layerMap.delete(arid);
      }
    });
  }

  /** @returns TileLayer */
  private async buildLayer(ldef: FBInfoLayer, index: string) {
    let source: TileWMS | WMTS | XYZ;
    if (ldef[1].type === 'InfoLayer') {
      if (ldef[1].values?.sourceType?.toLowerCase() === 'wms') {
        source = this.setWMSSource(ldef);
      } else if (ldef[1].values?.sourceType?.toLowerCase() === 'wmts') {
        source = await this.setWMTSSource(ldef);
      } else if (ldef[1].values?.sourceType?.toLowerCase() === 'xyz') {
        source = new XYZ({
          url: ldef[1].values?.url
        });
      }
      const layer = new TileLayer({
        source: source,
        preload: 0,
        zIndex: this.zIndex + parseInt(index),
        minZoom: ldef[1].values?.minZoom ?? 1,
        maxZoom: ldef[1].values?.maxZoom ?? 24,
        opacity: ldef[1].values?.opacity ?? 1
      });
      layer.set('id', ldef[0]);
      return layer;
    }
  }

  /** remove layer and render map */
  private removeLayer(id: string) {
    const map = this.mapComponent.getMap();
    if (!map) return;
    if (!this.layerMap.has(id)) return;
    const lc = this.layerGroup.getLayers();
    lc.remove(this.layerMap.get(id).layer);
    map.render();
  }

  /** @returns WMS tile source */
  private setWMSSource(ldef: any): TileWMS {
    return new TileWMS({
      url: ldef[1].values?.url,
      params: {
        LAYERS: ldef[1].values?.layers ? ldef[1].values?.layers.join(',') : ''
      }
    });
  }

  /** @returns WMTS source */
  private async setWMTSSource(ldef: any): Promise<WMTS> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    if (!this.wmtsCapabilitesMap.has(ldef[1].values?.url)) {
      try {
        const response = await fetch(
          `${ldef[1].values?.url}?request=GetCapabilities&service=wmts`
        );
        const capabilitiesXml = await response.text();
        if (!capabilitiesXml) {
          console.log('Error: GetCapabilities response is empty!');
          return;
        }
        const parser = new WMTSCapabilities();
        result = parser.read(capabilitiesXml);
        this.wmtsCapabilitesMap.set(ldef[1].values?.url, result);
      } catch (err) {
        console.log(err);
        return;
      }
    } else {
      // get pre-fetched capabilities
      result = this.wmtsCapabilitesMap.get(ldef[1].values?.url);
    }
    const options = optionsFromCapabilities(result, {
      layer: ldef[1].values?.layers[0],
      matrixSet: 'EPSG:3857'
    });
    return new WMTS(options);
  }
}
