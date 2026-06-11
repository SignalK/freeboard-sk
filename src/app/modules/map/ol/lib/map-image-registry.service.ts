import { Injectable } from '@angular/core';
import { Circle, Fill, Icon, Stroke } from 'ol/style';
import {
  getAtoNDefs,
  ATON_TYPE_IDS,
  getPoiDefs,
  getVesselDefs,
  getWaypointDefs,
  AIS_TYPE_IDS,
  AIS_MOORED_STYLE_IDS
} from 'src/app/modules/icons';

interface MapImageCollection {
  [id: string | number]: Icon;
}

interface MapImages {
  atons: MapImageCollection;
  poi: MapImageCollection;
  vessels: MapImageCollection;
  waypoints: MapImageCollection;
  symbols: MapImageCollection;
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
    vessels: {},
    waypoints: {},
    symbols: {}
  };

  /** Definitions for external symbols registered by SymbolService. */
  private symbolDefs: { [ref: string]: MapIconDef } = {};

  private atonImageDefs: any = {
    virtual: {},
    real: {}
  };
  private poiImageDefs = {};
  private vesselImageDefs = {};
  private waypointImageDefs = {};

  constructor() {
    this.atonImageDefs = getAtoNDefs();
    this.poiImageDefs = getPoiDefs();
    this.vesselImageDefs = getVesselDefs();
    this.waypointImageDefs = getWaypointDefs();
  }

  /**
   * @description Returns image for the supplied AtoN identifier
   * @param id AtoN identifier
   * @param virtual true = virtual AtoN, false = real AtoN
   * @returns Icon object
   */
  getAtoN(id: number | string, virtual?: boolean): Icon {
    const vid = ATON_TYPE_IDS[id] ?? 'aton';
    const variant = virtual ? 'virtual' : 'real';
    const defs = virtual ? this.atonImageDefs.virtual : this.atonImageDefs.real;
    // External symbol override keyed by "real-<vid>" / "virtual-<vid>"
    // (matches the built-in svg basenames, e.g. "real-north", "virtual-port").
    const ext = this.getExternalSymbol(`${variant}-${vid}`);
    if (ext) {
      return ext;
    }
    // Cache key includes the real/virtual variant so the two do not collide
    // (real-north and virtual-north use different artwork).
    const key = `${variant}-${vid}`;
    if (!this.icons.atons[key]) {
      this.buildIcon(this.icons.atons, defs, vid, false, key);
    }
    const fallback = `${variant}-aton`;
    if (!this.icons.atons[fallback]) {
      this.buildIcon(this.icons.atons, defs, 'aton', false, fallback);
    }
    return this.icons.atons[key] ?? this.icons.atons[fallback];
  }

  /**
   * @description Returns image for the supplied AIS shipType identifier
   * @param id  AIS shipType identifier
   * @returns Icon | Circle style object
   */
  getVessel(id: number | string, moored?: boolean): Icon | Circle {
    if (moored) {
      const s = AIS_MOORED_STYLE_IDS[id] ?? AIS_MOORED_STYLE_IDS['default'];
      return new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: s[0]
        }),
        fill: new Fill({
          color: s[1]
        })
      });
    } else {
      const vid = AIS_TYPE_IDS[id];
      // External symbol override keyed by the vessel icon id (e.g. "ais_cargo").
      const ext = this.getExternalSymbol(vid);
      if (ext) {
        return ext;
      }
      if (!this.icons.vessels[vid]) {
        this.buildIcon(this.icons.vessels, this.vesselImageDefs, vid, true);
      }
      return this.icons.vessels[vid] ?? this.icons.vessels['default'];
    }
  }

  /**
   * Register an external symbol as a map-marker definition.
   * Called by SymbolService after load(). ref is the canonical "namespace:id".
   */
  registerSymbolMarker(ref: string, def: MapIconDef): void {
    // Register exactly the supplied key. SymbolService registers both the
    // qualified ref and (for fsk overrides only) the bare built-in id, so a
    // bare lookup resolves to an override but not to an arbitrary custom symbol.
    this.symbolDefs[ref] = def;
  }

  /**
   * @description Returns image for the supplied symbol/POI identifier.
   * Checks external symbol defs (namespace:id or bare local id) before falling
   * back to built-in POI icons.
   * @param id Symbol identifier — may be a qualified "namespace:id" external ref
   *           or a bare built-in POI name.
   * @returns Icon object
   */
  getSymbol(id: string): Icon {
    id = id ?? 'default';
    if (id.startsWith('default:')) {
      // Forced built-in: strip the reserved prefix and skip override lookup.
      id = id.slice('default:'.length);
    } else if (id in this.symbolDefs) {
      // External override (qualified or unqualified external ref).
      if (!this.icons.symbols[id]) {
        this.buildIcon(this.icons.symbols, this.symbolDefs, id);
      }
      return this.icons.symbols[id] ?? this.icons.poi['default'];
    }
    if (!this.icons.poi[id]) {
      this.buildIcon(this.icons.poi, this.poiImageDefs, id);
    }
    return this.icons.poi[id] ?? this.icons.poi['default'];
  }

  /** @deprecated Use getSymbol() instead. */
  getPOI(id: string): Icon {
    return this.getSymbol(id);
  }

  /**
   * @description Returns an Icon for an external symbol override registered
   * for the supplied id, or null if none is registered.
   * Unlike getSymbol(), this does NOT fall back to a built-in icon. Callers
   * use it to decide whether to apply a symbol override or keep their own
   * default rendering (e.g. programmatically-drawn shapes).
   * @param id Symbol identifier (qualified "namespace:id" or bare local id).
   * @returns Icon object or null
   */
  getExternalSymbol(id: string): Icon | null {
    if (!id || !(id in this.symbolDefs)) {
      return null;
    }
    if (!this.icons.symbols[id]) {
      this.buildIcon(this.icons.symbols, this.symbolDefs, id);
    }
    return this.icons.symbols[id] ?? null;
  }

  /**
   * @description Returns image for the supplied Waypoint type.
   * Only the 'waypoint' type resolves external symbol overrides; other types
   * (start-pin, pseudoaton, …) always render their built-in icon. A "default:"
   * prefixed skIcon forces the built-in even when an override exists.
   * @param type Waypoint type
   * @param skIcon Optional skIcon override — may be "namespace:id" or "default:id".
   * @returns Icon object
   */
  getWaypoint(type: string, skIcon?: string): Icon {
    type = !type ? 'default' : type;
    let wid = skIcon ?? type;
    if (type === 'waypoint') {
      if (wid.startsWith('default:')) {
        // Forced built-in: strip the reserved prefix and skip override lookup.
        wid = wid.slice('default:'.length);
      } else if (wid in this.symbolDefs) {
        if (!this.icons.symbols[wid]) {
          this.buildIcon(this.icons.symbols, this.symbolDefs, wid);
        }
        return this.icons.symbols[wid] ?? this.icons.waypoints['default'];
      }
    }
    if (!this.icons.waypoints[wid]) {
      this.buildIcon(this.icons.waypoints, this.waypointImageDefs, wid);
    }
    return (
      this.icons.waypoints[wid] ??
      this.icons.waypoints[type] ??
      this.icons.waypoints['default']
    );
  }

  /**
   * @description Build Icon object into the selected group
   * @param group Reference to the image group to place the icon.
   * @param iconDef Icon definitions
   * @param id Icon identifier
   * @param rotate Rotate icon with view (default=false)
   * @returns
   */
  private buildIcon(
    group: MapImageCollection,
    iconDef: { [id: string]: any },
    id: number | string,
    rotate: boolean = false,
    cacheKey: number | string = id
  ) {
    if (!iconDef[id]) return;
    group[cacheKey] = new Icon({
      src: iconDef[id].path,
      scale: iconDef[id].scale,
      anchor: iconDef[id].anchor,
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      rotateWithView: rotate,
      rotation: 0
    });
  }
}
