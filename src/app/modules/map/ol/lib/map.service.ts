import { Injectable, signal } from '@angular/core';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import { get as getProj } from 'ol/proj';
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
  getMapById(id: string): Map {
    let map: Map = null;
    for (let i = 0; i < this.maps.length; i++) {
      if (this.maps[i].getTarget() === id) {
        map = this.maps[i];
        break;
      }
    }
    return map;
  }

  getLayerByKey(key: string, value: string): BaseLayer {
    let tl: BaseLayer;
    this.maps.forEach((map) => {
      map.getLayers().forEach((layer) => {
        if (layer.get(key) === value) {
          tl = layer;
        }
      });
    });
    return tl;
  }

  addMap(map: Map): void {
    this.maps.push(map);
  }

  updateSize() {
    this.maps.forEach((map) => {
      map.updateSize();
    });
  }

  addProj4(epsg: string, proj4Def: string, extent?) {
    let projection = getProj(epsg);
    if (!projection) {
      proj4.defs(epsg, proj4Def);
      register(proj4);
      projection = getProj(epsg);
      if (extent) {
        projection.setExtent(extent);
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
