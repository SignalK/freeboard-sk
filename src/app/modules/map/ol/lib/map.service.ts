import { Injectable, signal } from '@angular/core';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import { get as getProj } from 'ol/proj';
import type { Extent } from 'ol/extent';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

export interface FeatureUrl {
  id: string;
  name: string;
  type: 'chart';
  subType: 'wms';
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  maps: Map[];
  private secondaryMaps = new WeakSet<Map>();

  private _featureInfo = signal<FeatureUrl[]>([]);
  public readonly featureUrls = this._featureInfo.asReadonly();

  constructor() {
    this.maps = [];
  }

  /**
   * Retrieves all the maps
   */
  getMaps(): Map[] {
    return this.maps;
  }

  /**
   * Returns a map object from the maps array
   */
  getMapById(id: string): Map | null {
    let map: Map | null = null;
    for (let i = 0; i < this.maps.length; i++) {
      if (this.maps[i].getTarget() === id) {
        map = this.maps[i];
        break;
      }
    }
    return map;
  }

  getLayerByKey(key: string, value: string): BaseLayer | undefined {
    let tl: BaseLayer | undefined;
    this.maps.forEach((map) => {
      map.getLayers().forEach((layer) => {
        if (layer.get(key) === value) {
          tl = layer;
        }
      });
    });
    return tl;
  }

  /**
   * Registers a map. A `secondary` map (the split view's second pane) is kept
   * after every other map, so the main chart stays at `getMaps()[0]` whichever
   * of them starts first.
   */
  addMap(map: Map, secondary = false): void {
    if (secondary) {
      this.secondaryMaps.add(map);
      this.maps.push(map);
      return;
    }
    const firstSecondary = this.maps.findIndex((m) =>
      this.secondaryMaps.has(m)
    );
    if (firstSecondary < 0) {
      this.maps.push(map);
    } else {
      this.maps.splice(firstSecondary, 0, map);
    }
  }

  removeMap(map: Map): void {
    this.maps = this.maps.filter((m) => m !== map);
  }

  updateSize() {
    this.maps.forEach((map) => {
      map.updateSize();
    });
  }

  addProj4(epsg: string, proj4Def: string, extent?: Extent) {
    let projection = getProj(epsg);
    if (!projection) {
      proj4.defs(epsg, proj4Def);
      register(proj4);
      projection = getProj(epsg);
      if (extent) {
        projection?.setExtent(extent);
      }
    }
    if (!projection) {
      console.error(`Failed to register ${epsg} projection in OpenLayers`);
    }
  }

  addFeatureUrls(v: FeatureUrl | FeatureUrl[]) {
    this._featureInfo.update((current) => {
      if (Array.isArray(v)) {
        return current.concat(v);
      } else {
        current.push(v);
        return current;
      }
    });
  }

  clearFeatureUrls() {
    this._featureInfo.set([]);
  }
}
