import { Injectable } from '@angular/core';
import { Circle, Fill, Icon, Stroke } from 'ol/style';
import {
  getAtoNDefs,
  ATON_TYPE_IDS,
  getPoiDefs,
  getVesselDefs,
  getWaypointDefs,
  AIS_TYPE_IDS,
  AIS_MOORED_STYLE_IDS,
  meteoWindBucket
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

/** Symbol ref for the wind-direction arrow; a provider may override it. */
export const WIND_ARROW_SYMBOL = 'windIndicator-arrow';

// Built-in arrow glyph, drawn north-up and rotated by the renderer to point in
// the direction the wind is flowing towards.
const WIND_ARROW_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">' +
      '<path d="M14 2 L24 16 H18 V40 H10 V16 H4 Z" fill="#2687ff" stroke="white" stroke-width="2" stroke-linejoin="round"/>' +
      '</svg>'
  );

@Injectable({
  providedIn: 'root'
})
export class MapImageRegistry {
  // Null-prototype caches so a resource-supplied id (e.g. a note skIcon of
  // 'toString' or '__proto__') cannot collide with inherited Object keys on
  // lookup or pollute the prototype on assignment.
  private icons: MapImages = {
    atons: Object.create(null),
    poi: Object.create(null),
    vessels: Object.create(null),
    waypoints: Object.create(null),
    symbols: Object.create(null)
  };

  /** Definitions for external symbols registered by SymbolService. */
  private symbolDefs: { [ref: string]: MapIconDef } = Object.create(null);

  /** Cached built-in wind arrow (used when no provider override exists). */
  private windArrowIcon: Icon;

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
    return this.resolveAtoN(ATON_TYPE_IDS[id] ?? 'aton', virtual);
  }

  /**
   * @description Returns the barb/windsock image for a meteo (weather-station)
   * target, chosen by its reported wind speed. Barbs are bundled per 5-knot
   * bucket (`weatherStation-5..75`) and a provider may override any bucket via a
   * `<variant>-weatherStation-<kts>` symbol. Below the first bucket, or with no
   * wind reported, the plain windsock (`weatherStation`) is used.
   * @param tws reported wind speed in m/s (Signal K native unit), or null/undefined
   * @param virtual true = virtual AtoN variant
   * @returns Icon object
   */
  getMeteoIcon(tws: number | null | undefined, virtual?: boolean): Icon {
    const bucket = meteoWindBucket(tws);
    const vid = bucket ? `weatherStation-${bucket}` : 'weatherStation';
    return this.resolveAtoN(vid, virtual, 'weatherStation');
  }

  /**
   * @description Returns the wind-direction arrow icon used when the "arrow with
   * speed" wind indicator is selected. A symbol provider may override the built-in
   * glyph by registering the `windIndicator-arrow` symbol; otherwise the bundled
   * arrow is returned. Callers rotate the returned icon to the wind flow direction.
   * The arrow is a geographic vector, so it must rotate with the map view — the
   * override is requested with `rotate` so a provider glyph keeps that behaviour.
   * @returns Icon object
   */
  getWindArrow(): Icon {
    const ext = this.getExternalSymbol(WIND_ARROW_SYMBOL, true);
    if (ext) {
      return ext;
    }
    if (!this.windArrowIcon) {
      this.windArrowIcon = new Icon({
        src: WIND_ARROW_SVG,
        anchor: [0.5, 0.5],
        scale: 0.78,
        rotateWithView: true,
        rotation: 0
      });
    }
    return this.windArrowIcon;
  }

  /**
   * Resolve an AtoN/meteo icon by its variant id: external symbol override
   * first, then the bundled artwork, then the supplied fallback id.
   */
  private resolveAtoN(
    vid: string,
    virtual?: boolean,
    fallbackVid = 'aton'
  ): Icon {
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
    const fallback = `${variant}-${fallbackVid}`;
    if (!this.icons.atons[fallback]) {
      this.buildIcon(this.icons.atons, defs, fallbackVid, false, fallback);
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
    } else if (Object.hasOwn(this.symbolDefs, id)) {
      // External override (qualified or unqualified external ref).
      if (!this.icons.symbols[id]) {
        this.buildIcon(this.icons.symbols, this.symbolDefs, id);
      }
      return this.icons.symbols[id] ?? this.icons.poi['default'];
    }
    if (!this.icons.poi[id]) {
      this.buildIcon(this.icons.poi, this.poiImageDefs, id);
    }
    if (!this.icons.poi['default']) {
      this.buildIcon(this.icons.poi, this.poiImageDefs, 'default');
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
   * @param rotate true to build the icon so it rotates with the map view (for
   *   overrides of geographic-vector glyphs such as the wind arrow).
   * @returns Icon object or null
   */
  getExternalSymbol(id: string, rotate = false): Icon | null {
    if (!id || !Object.hasOwn(this.symbolDefs, id)) {
      return null;
    }
    // Cache identity must include `rotate`: a rotated and a non-rotated icon are
    // distinct, so keep them under separate keys (non-rotated stays under the
    // bare id so getSymbol/getWaypoint overrides still resolve).
    const key = rotate ? `${id}::rotate` : id;
    if (!this.icons.symbols[key]) {
      this.buildIcon(this.icons.symbols, this.symbolDefs, id, rotate, key);
    }
    return this.icons.symbols[key] ?? null;
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
      } else if (Object.hasOwn(this.symbolDefs, wid)) {
        if (!this.icons.symbols[wid]) {
          this.buildIcon(this.icons.symbols, this.symbolDefs, wid);
        }
        return this.icons.symbols[wid] ?? this.icons.waypoints['default'];
      }
    }
    if (!this.icons.waypoints[wid]) {
      this.buildIcon(this.icons.waypoints, this.waypointImageDefs, wid);
    }
    if (!this.icons.waypoints[type]) {
      this.buildIcon(this.icons.waypoints, this.waypointImageDefs, type);
    }
    if (!this.icons.waypoints['default']) {
      this.buildIcon(this.icons.waypoints, this.waypointImageDefs, 'default');
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
    if (!Object.hasOwn(iconDef, id)) return;
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
