import { Injectable } from '@angular/core';
import { Icon } from 'ol/style';
import {
  getAtoNDefs,
  ATON_TYPE_IDS,
  getPoiDefs,
  getVesselDefs,
  AIS_TYPE_IDS
} from 'src/app/modules/icons';

interface MapImageCollection {
  [id: string | number]: Icon;
}

interface MapImages {
  atons: MapImageCollection;
  poi: MapImageCollection;
  vessels: MapImageCollection;
}

export interface MapIconDef {
  path: string;
  scale?: number;
  anchor?: [number, number];
}

@Injectable({
  providedIn: 'root'
})
export class MapImageRegistry {
  private icons: MapImages = {
    atons: {},
    poi: {},
    vessels: {}
  };

  private atonImageDefs: any = {
    virtual: {},
    real: {}
  };
  private poiImageDefs = {};
  private vesselImageDefs = {};

  constructor() {
    this.atonImageDefs = getAtoNDefs();
    this.poiImageDefs = getPoiDefs();
    this.vesselImageDefs = getVesselDefs();
  }

  /**
   * @description Returns image for the supplied AtoN identifier
   * @param id AtoN identifier
   * @param virtual true = virtual AtoN, false = real AtoN
   * @returns Icon object
   */
  getAtoN(id: number | string, virtual?: boolean): Icon {
    const vid = ATON_TYPE_IDS[id] ?? 'aton';
    if (!this.icons.atons[vid]) {
      this.buildIcon(
        this.icons.atons,
        virtual ? this.atonImageDefs.virtual : this.atonImageDefs.real,
        vid
      );
    }
    return this.icons.atons[vid] ?? this.icons.atons['aton'];
  }

  /**
   * @description Returns image for the supplied AIS shipType identifier
   * @param id  AIS shipType identifier
   * @returns Icon object
   */
  getVessel(id: number | string): Icon {
    const vid = AIS_TYPE_IDS[id];
    if (!this.icons.atons[vid]) {
      this.buildIcon(this.icons.vessels, this.vesselImageDefs, vid);
    }
    return this.icons.vessels[vid] ?? this.icons.vessels['active'];
  }

  /**
   * @description Returns image for the supplied Point of Interest identifier
   * @param id Point of Interest identifier
   * @returns Icon object
   */
  getPOI(id: string): Icon {
    id = id ?? 'default';
    if (!this.icons.poi[id]) {
      this.buildIcon(this.icons.poi, this.poiImageDefs, id);
    }
    return this.icons.poi[id] ?? this.icons.poi.default;
  }

  /**
   * @description Build Icon object into the selected group
   * @param group Reference to the image group to place the icon.
   * @param iconDef Icon definitions
   * @param id Icon identifier
   * @returns
   */
  private buildIcon(
    group: MapImageCollection,
    iconDef: { [id: string]: any },
    id: number | string
  ) {
    if (!iconDef[id]) return;
    group[id] = new Icon({
      src: iconDef[id].path,
      scale: iconDef[id].scale,
      anchor: iconDef[id].anchor,
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      rotateWithView: false,
      rotation: 0
    });
  }
}
