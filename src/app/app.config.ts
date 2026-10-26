import { Type, type TSchema } from 'typebox';
import { Check, Clone, Create } from 'typebox/value';
import {
  FBAppData,
  IAppConfig,
  LegacyAppConfig,
  TemperatureUnitDef
} from './types';
import { AppConfigSchema } from './app.config.schema';
import { Convert } from './lib/convert';
import { legacyPanBehavior, normaliseCenterOffset } from './lib/follow-offset';
import { SKVessel } from './modules';
import { migrateTrailSource } from './modules/skstream/track-source';

const isSection = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Whether settings read from the server are a saved config at all, so that a
 * malformed one, cleaned to the defaults, never replaces the local settings.
 * Every release since 2.13 saves the speed unit and the zoom level.
 */
export const isSavedConfig = (value: unknown): boolean =>
  isSection(value) &&
  isSection(value.units) &&
  typeof value.units.speed === 'string' &&
  isSection(value.map) &&
  typeof value.map.zoomLevel === 'number';

/**
 * Fills each setting that is missing, or stored with the wrong JSON type, with
 * its default. Keys the schema doesn't know stay, so a setting a later release
 * added survives this one saving the shared config. A list or a per-id map
 * loses only its entries of the wrong type, not the rest of the user's work.
 */
function applyDefaults(schema: TSchema, value: unknown): unknown {
  if (Type.IsObject(schema)) {
    const section = isSection(value) ? value : {};
    for (const [key, property] of Object.entries(schema.properties)) {
      const setting = applyDefaults(property, section[key]);
      if (setting === undefined) {
        delete section[key];
      } else {
        section[key] = setting;
      }
    }
    return section;
  }
  if (Type.IsRecord(schema) && isSection(value)) {
    const entry = Type.RecordValue(schema);
    for (const [key, item] of Object.entries(value)) {
      if (!Check(entry, item)) {
        delete value[key];
      }
    }
    return value;
  }
  const list = Type.IsUnion(schema)
    ? schema.anyOf.find((member) => Type.IsArray(member))
    : schema;
  const setting =
    list && Type.IsArray(list) && Array.isArray(value)
      ? value.filter((item) => Check(list.items, item))
      : value;
  if (setting !== undefined && Check(schema, setting)) {
    return setting;
  }
  return 'default' in schema ? Clone(schema.default) : undefined;
}

/**
 * Upgrades settings stored by an earlier release. Runs before the defaults are
 * applied, as some steps read settings a default would otherwise fill in.
 */
function migrate(settings: LegacyAppConfig) {
  const { units, map, vessels, resources, selections } = settings;
  // the alarm radius is the one setting of the layout before 2.17 kept, as it
  // is the radius last used rather than a preference
  if (typeof settings.anchorRadius === 'number') {
    if (!isSection(settings.anchor)) {
      settings.anchor = {} as LegacyAppConfig['anchor'];
    }
    settings.anchor.radius ??= settings.anchorRadius;
  }
  const depth = units?.depth === 'ft' ? 'foot' : units?.depth;
  if (isSection(units)) {
    if (depth) {
      units.depth = depth;
    }
    if (typeof units.temperature === 'string') {
      units.temperature = units.temperature.toUpperCase() as TemperatureUnitDef;
    }
    units.length ??= depth ?? 'm';
    if (units.speed === 'msec') {
      units.speed = 'm/s';
    } else if (units.speed === 'kmh') {
      units.speed = 'km/h';
    }
    if (units.distance === 'm') {
      units.distance = 'kilometer';
    } else if (units.distance === 'ft') {
      units.distance = 'naut-mile';
    }
    // Releases before 2.20 always showed the units set in Freeboard; keep
    // showing them rather than switching to the server's on upgrade.
    units.useServerPrefs ??= false;
    if (!units.positionFormat) {
      delete (units as Partial<typeof units>).positionFormat;
    }
    // Orientation defaulted to COG, which points the boat at GPS noise when it
    // is stationary (#704, #338). Move existing installs onto 'auto' once: a
    // stored value equal to the old default was almost never a deliberate
    // choice, but after this runs a genuine choice of COG must stick, hence
    // the one-time flag rather than an unconditional coercion.
    // @todo remove (implemented) v2.32.0
    if (!units.autoHeadingApplied) {
      if (units.preferredPaths?.heading === 'navigation.courseOverGroundTrue') {
        units.preferredPaths.heading = 'auto';
      }
      units.autoHeadingApplied = true;
    }
  }

  if (isSection(map)) {
    // The chart depth unit started out as the depth unit.
    if (isSection(map.s57Options)) {
      map.s57Options.depthUnit ??= depth ?? 'm';
    } else {
      map.s57Options = {
        depthUnit: depth ?? 'm'
      } as typeof map.s57Options;
    }
    const legacy = map as unknown as {
      lockMoveMap?: boolean;
      centerOffsetAbeam?: number;
    };
    if (typeof map.panBehavior === 'undefined') {
      map.panBehavior = legacyPanBehavior(legacy.lockMoveMap);
      delete legacy.lockMoveMap;
    }
    // Coerce every superseded shape — the vessel-frame {ahead, abeam} pair, an
    // even older single along-course percentage, or the 0-0.7 fractional
    // preset — to the screen-fixed {x, y} offset.
    map.centerOffset = normaliseCenterOffset(
      map.centerOffset,
      legacy.centerOffsetAbeam
    );
    delete legacy.centerOffsetAbeam;
  }

  if (isSection(vessels)) {
    // The trail older than an hour is simplified by the server to the map's
    // zoom, so it can be sampled finely. Move installs still on the old coarse
    // defaults (1 min, 5 min) to the new ones once: after this, a deliberate
    // choice of a coarse resolution must stick, hence the one-time flag.
    if (!vessels.trailResolutionApplied) {
      const r = vessels.trailResolution;
      if (r?.next23 === '1m') {
        r.next23 = '5s';
      }
      if (r?.beyond24 === '5m') {
        r.beyond24 = '10s';
      }
      vessels.trailResolutionApplied = true;
    }
    // legacy boolean trailFromServer -> tri-state trailSource (#820)
    if (typeof vessels.trailSource === 'undefined') {
      vessels.trailSource = migrateTrailSource(
        vessels.trailFromServer,
        vessels.trailSource
      );
    }
    delete vessels.trailFromServer;
    // @todo remove (implemented) v2.22.2
    if (typeof vessels.selfLines === 'undefined') {
      vessels.selfLines = {
        cog: { length: vessels.cogLine ?? 10 },
        heading: { length: vessels.headingLineSize ?? -1 }
      } as LegacyAppConfig['vessels']['selfLines'];
      delete vessels.cogLine;
      delete vessels.headingLineSize;
    }
  }

  // A section saved before these settings existed takes the values earlier
  // releases gave it, which differ from a fresh install's.
  if (typeof resources === 'undefined') {
    settings.resources = {
      notes: { groupRequiresPosition: false }
    } as typeof settings.resources;
  }
  const legacyResources = settings.resources;
  if (
    isSection(legacyResources) &&
    typeof legacyResources.video === 'undefined'
  ) {
    legacyResources.video = { url: '' } as typeof legacyResources.video;
  }
  if (isSection(selections)) {
    for (const key of ['chartOrder', 'tracks', 'infolayers'] as const) {
      if (typeof selections[key] === 'undefined') {
        selections[key] = [];
      }
    }
    // legacy notes selections section
    delete selections.notes;
  }
  if (typeof settings.radars === 'undefined') {
    settings.radars = { deviceId: '' } as typeof settings.radars;
  }

  // early plotterExtensions shape
  const extensions = settings.plotterExtensions;
  if (isSection(extensions)) {
    delete extensions.enabled;
    if (Array.isArray(extensions.widgets)) {
      extensions.widgets = extensions.widgets
        .filter((w) => isSection(w))
        .map((w) => {
          // early builds used `corner` with a `tl` option
          if (w.corner && !w.anchor) {
            w.anchor = w.corner === 'tl' ? 'tr' : w.corner;
            delete w.corner;
          }
          return w;
        })
        .filter(
          (w) =>
            w.anchor !== undefined &&
            ['tr', 'ct', 'cb', 'bl', 'br'].includes(w.anchor)
        );
    }
  }
}

// clean loaded app config (migrates legacy shapes in place)
export function cleanConfig(
  settings: LegacyAppConfig,
  hostParams: { [key: string]: unknown }
) {
  migrate(settings);
  applyDefaults(AppConfigSchema, settings);
  const config = settings as IAppConfig;
  // force proxied = true for stored config.
  config.signalk.proxied = true;

  // apply url params
  if (typeof hostParams.northup !== 'undefined') {
    config.ui.mapNorthUp = hostParams.northup === '0' ? false : true;
  }
  if (typeof hostParams.movemap !== 'undefined') {
    config.ui.mapMove = hostParams.movemap === '0' ? false : true;
  }
  if (hostParams.zoom) {
    try {
      const z = parseInt(hostParams.zoom as string);
      if (!isNaN(z)) {
        config.map.zoomLevel = z > 28 ? 28 : z < 1 ? 1 : z;
      }
    } catch {
      console.warn(
        `Invalid zoom level parameter (${hostParams.zoom} supplied!`
      );
    }
  }
}

// initialise default configuration
export function defaultConfig(): IAppConfig {
  return Create(AppConfigSchema);
}

// initialise state data
export function initData(): FBAppData {
  // the active vessel is own vessel until another is selected
  const self = new SKVessel();
  return {
    loginRequired: false,
    chartBounds: {
      show: false,
      charts: []
    },
    selfId: null,
    activeRoute: null,
    activeRouteReversed: false,
    activeRouteCircular: false,
    activeRouteIsEditing: false,
    editingId: null,
    activeWaypoint: null,
    serverTrail: false, // trail received from server
    server: null,
    lastGet: null, // map position of last resources GET
    map: {
      atClick: {
        features: [],
        lonlat: [0, 0]
      }
    },
    vessels: {
      // received vessel data
      showSelf: false,
      self,
      aisTargets: new Map(),
      aisTracks: new Map(), // AIS targets track (tracks plugin)
      activeId: null,
      active: self,
      closest: [],
      cpaPositions: new Map(),
      prefAvailablePaths: {}, // preference paths available from source,
      flagged: [], // flagged ais targets
      showTrack: [] // ais targets to display track for (session-only)
    },
    aircraft: new Map(), // received AIS aircraft data
    atons: new Map(), // received AIS AtoN data
    sar: new Map(), // received AIS SaR data
    meteo: new Map(), // received AIS Meteo data
    racing: {
      startLine: []
    }
  };
}

// process url tokens from settings
export const processUrlTokens = (s: string, config: IAppConfig): string => {
  if (!s) {
    return s;
  }
  const ts = s.split('%');
  if (ts.length > 1) {
    const uts = ts.map((i) => {
      if (i === 'map:latitude') {
        return config.map.center[1];
      } else if (i === 'map:longitude') {
        return config.map.center[0];
      } else if (i === 'map:zoom') {
        return Math.floor(config.map.zoomLevel);
      } else if (i === 'note:radius') {
        const dist =
          config.units.distance === 'kilometer'
            ? config.resources.notes.getRadius
            : Math.floor(
                Convert.nauticalMilesToKm(config.resources.notes.getRadius)
              );
        return dist * 1000;
      } else if (i === 'fetch:radius') {
        const dist =
          config.units.distance === 'kilometer'
            ? config.resources.notes.getRadius
            : Math.floor(
                Convert.nauticalMilesToKm(config.resources.fetchRadius)
              );
        return dist * 1000;
      } else {
        return i;
      }
    });
    s = uts.join('');
  }
  return s;
};
