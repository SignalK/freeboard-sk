import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import { TileWMS, WMTS } from 'ol/source';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';

import { MapComponent } from '../map.component';
import { MapService } from '../map.service';
import { FBInfoLayer, FBInfoLayers } from 'src/app/types';
import { SKInfoLayer, SKResourceService } from 'src/app/modules/skresources';

import LayerGroup from 'ol/layer/Group';
import BaseLayer from 'ol/layer/Base';
import { Collection } from 'ol';

/*const infoLayers = [
  [
    'info_1_wms',
    {
      name: 'nowChart watches warnings & advisories',
      description: 'WMS info layer.',
      type: 'InfoLayer',
      values: {
        url: 'https://nowcoast.noaa.gov/geoserver/hazards/alerts/ows',
        sourceType: 'WMS',
        layers: ['watches_warnings_advisories'],
        opacity: 0.6,
        minZoom: 1,
        maxZoom: 24
      }
    },
    true
  ],
  [
    'info_2_wmts',
    {
      name: '112 Festnetz',
      description: 'WMTS info layer.',
      type: 'InfoLayer',
      values: {
        url: 'https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml',
        sourceType: 'WMTS',
        layers: ['ch.bakom.notruf-112_festnetz'],
        opacity: 0.6,
        minZoom: 1,
        maxZoom: 24,
        refreshInterval: 60000
      }
    },
    true
  ]
];*/

interface LiveLayer {
  layer: TileLayer;
  lastRefresh: number;
  infoLayer: SKInfoLayer;
}

// ** Freeboard InfoLayer Group **
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
  @Output() timeDimensionUpdated = new EventEmitter<string>();

  protected layerGroup: LayerGroup;
  private wmtsCapabilitesMap = new Map();
  private layerMap: Map<string, LiveLayer> = new Map();
  private refreshTimer;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent,
    private mapService: MapService,
    private skres: SKResourceService
  ) {
    this.changeDetectorRef.detach();
    this.refreshTimer = setInterval(() => this.onTimerTick(), 60000);
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

  /** Refresh time dimension bounds from WMS/WMTS capabilities */
  private async refreshTimeDimension(layerId: string, liveLayer: LiveLayer) {
    const infoLayer = liveLayer.infoLayer;
    const sourceType = infoLayer.values?.sourceType?.toLowerCase();
    
    const oldValues = infoLayer.values.time?.values || [];
    const oldMostRecent = oldValues.length > 0 ? oldValues[oldValues.length - 1] : null;
    
    try {
      if (sourceType === 'wmts') {
        // Fetch fresh WMTS capabilities
        const response = await fetch(
          `${infoLayer.values.url}?request=GetCapabilities&service=wmts`
        );
        const capabilitiesXml = await response.text();
        if (!capabilitiesXml) {
          return;
        }
        
        const parser = new WMTSCapabilities();
        const result = parser.read(capabilitiesXml);
        
        // Find the layer and extract time dimension
        const layers = result?.Contents?.Layer;
        if (layers) {
          const layer = layers.find((l: any) => 
            infoLayer.values.layers.includes(l.Identifier)
          );
          if (layer?.Dimension) {
            const timeDim = layer.Dimension.find((dim: any) => 
              dim.Identifier?.toLowerCase() === 'time'
            );
            if (timeDim) {
              const values = Array.isArray(timeDim.Value) ? timeDim.Value : 
                             (timeDim.Value ? timeDim.Value.split(',') : []);
              if (values.length > 0) {
                infoLayer.values.time.values = values;
              }
            }
          }
        }
      } else if (sourceType === 'wms') {
        // Fetch fresh WMS capabilities
        const response = await fetch(
          `${infoLayer.values.url}?request=GetCapabilities&service=wms`
        );
        const capabilitiesXml = await response.text();
        if (!capabilitiesXml) {
          return;
        }
        
        // Parse WMS capabilities XML to extract time dimension
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(capabilitiesXml, 'text/xml');
        
        // Find the layer with matching name
        const layers = xmlDoc.getElementsByTagName('Layer');
        let targetLayer = null;
        
        for (let i = 0; i < layers.length; i++) {
          const layerNameEl = layers[i].getElementsByTagName('Name')[0];
          if (layerNameEl && infoLayer.values.layers.includes(layerNameEl.textContent)) {
            targetLayer = layers[i];
            break;
          }
        }
        
        if (targetLayer) {
          // Look for Dimension element with name="time"
          const dimensions = targetLayer.getElementsByTagName('Dimension');
          for (let i = 0; i < dimensions.length; i++) {
            const dimName = dimensions[i].getAttribute('name');
            if (dimName && dimName.toLowerCase() === 'time') {
              const timeValues = dimensions[i].textContent?.trim() || '';
              if (timeValues) {
                // Time values are comma-separated
                const values = timeValues.split(',').map(v => v.trim()).filter(v => v);
                if (values.length > 0) {
                  infoLayer.values.time.values = values;
                  const newMostRecent = values[values.length - 1];
                  console.log(`[${layerId}] Updated WMS time dimension:`, {
                    count: values.length,
                    oldMostRecent: oldMostRecent,
                    newMostRecent: newMostRecent,
                    changed: oldMostRecent !== newMostRecent,
                    allValues: values
                  });
                }
              }
              break;
            }
          }
        } else {
          console.log(`[${layerId}] Layer not found in WMS capabilities`);
        }
      }
    } catch (err) {
      console.error(`[${layerId}] Error refreshing time dimension:`, err);
    }
  }

  /** Process Refresh Timer tick */
  private async onTimerTick() {
    const n = Date.now();
    for (const [k, v] of this.layerMap.entries()) {
      const timeSinceLastRefresh = n - v.lastRefresh;
      const refreshInterval = v.infoLayer.values?.refreshInterval || 0;
      
      if (refreshInterval > 0 && timeSinceLastRefresh >= refreshInterval) {
        let needsSourceRebuild = false;
        
        // Refresh time dimension bounds if layer has time dimension
        if (v.infoLayer.values?.time?.values) {
          const oldValuesLength = v.infoLayer.values.time.values.length;
          const oldMostRecent = v.infoLayer.values.time.values[v.infoLayer.values.time.values.length - 1];
          
          await this.refreshTimeDimension(k, v);
          
          const newValuesLength = v.infoLayer.values.time.values.length;
          const newMostRecent = v.infoLayer.values.time.values[v.infoLayer.values.time.values.length - 1];
          
          // If time values changed or most recent changed, we need to rebuild the source
          if (newValuesLength !== oldValuesLength || oldMostRecent !== newMostRecent) {
            needsSourceRebuild = true;
            // Save updated time dimension to server
            await this.saveLayerToServer(k, v.infoLayer);
            // Emit event to notify parent component
            this.timeDimensionUpdated.emit(k);
          }
        }
        
        // Rebuild source if time dimension changed
        if (needsSourceRebuild) {
          const ldef = [k, v.infoLayer, true];
          let source: TileWMS | WMTS;
          if (v.infoLayer.values?.sourceType?.toLowerCase() === 'wms') {
            source = this.setWMSSource(ldef);
          } else if (v.infoLayer.values?.sourceType?.toLowerCase() === 'wmts') {
            source = await this.setWMTSSource(ldef);
          }
          if (source) {
            v.layer.setSource(source);
          }
        } else {
          // Just refresh the existing source
          const src = v.layer.getSource();
          src?.refresh();
        }
        
        v.lastRefresh = n;
      }
    }
  }

  private clearlayers() {
    const map = this.mapComponent.getMap();
    if (this.layerGroup && map) {
      map.removeLayer(this.layerGroup);
    }
  }

  /** Save updated layer to server */
  private async saveLayerToServer(layerId: string, layer: SKInfoLayer): Promise<void> {
    try {
      await this.skres.putToServer('infolayers', layerId, layer);
    } catch (err) {
      console.error(`Error saving layer to server:`, err);
    }
  }

  /** Calculate actual time value from offset */
  private getTimeValueFromOffset(timeDim: any): string | null {
    if (!timeDim || !timeDim.values || timeDim.values.length === 0) {
      return null;
    }
    
    const offset = timeDim.timeOffset ?? 0;
    if (offset === 0) {
      // Most recent
      return timeDim.values[timeDim.values.length - 1];
    }
    
    // Calculate target time based on offset
    const mostRecentTime = new Date(timeDim.values[timeDim.values.length - 1]).getTime();
    const targetTime = mostRecentTime + (offset * 60 * 60 * 1000); // offset is negative
    
    // Find closest time value to target
    let closestIndex = timeDim.values.length - 1;
    let closestDiff = Infinity;
    
    for (let i = 0; i < timeDim.values.length; i++) {
      const timeVal = new Date(timeDim.values[i]).getTime();
      const diff = Math.abs(timeVal - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    return timeDim.values[closestIndex];
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

        // Check if time dimension exists - if so, always rebuild source
        const hasTimeDimension = l[1].values?.time?.values !== undefined;
        
        if (hasTimeDimension) {
          // Rebuild the source with new dimensions
          let source: TileWMS | WMTS;
          if (l[1].values?.sourceType?.toLowerCase() === 'wms') {
            source = this.setWMSSource(l);
          } else if (l[1].values?.sourceType?.toLowerCase() === 'wmts') {
            source = await this.setWMTSSource(l);
          }
          if (source) {
            layer.setSource(source);
          }
        }

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
    let source: TileWMS | WMTS;
    if (ldef[1].type === 'InfoLayer') {
      if (ldef[1].values?.sourceType?.toLowerCase() === 'wms') {
        source = this.setWMSSource(ldef);
      } else if (ldef[1].values?.sourceType?.toLowerCase() === 'wmts') {
        source = await this.setWMTSSource(ldef);
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
    const params: any = {
      LAYERS: ldef[1].values?.layers ? ldef[1].values?.layers.join(',') : ''
    };
    
    // Add time dimension if present
    if (ldef[1].values?.time) {
      const timeValue = this.getTimeValueFromOffset(ldef[1].values.time);
      if (timeValue) {
        params.TIME = timeValue;
      }
    }
    
    return new TileWMS({
      url: ldef[1].values?.url,
      params: params
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
          return;
        }
        const parser = new WMTSCapabilities();
        result = parser.read(capabilitiesXml);
        this.wmtsCapabilitesMap.set(ldef[1].values?.url, result);
      } catch (err) {
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
    
    // Add time dimension if present
    if (ldef[1].values?.time) {
      const timeValue = this.getTimeValueFromOffset(ldef[1].values.time);
      if (timeValue) {
        options.dimensions = {
          Time: timeValue
        };
      }
    }
    
    return new WMTS(options);
  }
}
