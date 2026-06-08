import { AlertData } from '../alarms';
import {
  SKNote,
  SKRegion,
  SKResourceType,
  SKRoute,
  SKWaypoint
} from '../skresources';

import { OpenBridgeIcons } from './openbridge';
import { PoiIcons } from './poi';
import { AtoNsType1 } from './atons';
import { WaypointIcons, getWaypointDefs } from './waypoints';
import { VesselAisIcons, AIS_TYPE_IDS } from './vessels';

// ---- Module-level hook for SymbolService ----
// SymbolService calls setSymbolRegistry(this) after load() so that the pure
// functions below can resolve external symbols without requiring DI injection
// at every call site.  When null (pre-load or no provider) behavior is
// identical to today.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _symbolRegistry: any = null;

export const setSymbolRegistry = (registry: {
  resolveDisplayIcon(ref: string): AppIconDef | null;
  getExternalNoteIcons(showAll: boolean): Array<{ id: string; name: string }>;
  getExternalWaypointIcons(showAll: boolean): AppIconDef[];
  hasExternalVersion(id: string): boolean;
  getGpxMapping(ref: string): { gpxType?: string; gpxSym?: string } | null;
} | null): void => {
  _symbolRegistry = registry;
};

/**
 * @description Return the GPX mapping ({gpxType, gpxSym}) for the symbol
 * referenced by the supplied skIcon, or null when it is not an external symbol.
 * Used by GPX export to write a symbol's gpxType/gpxSym back to the file.
 */
export const getSymbolGpxMapping = (
  ref?: string
): { gpxType?: string; gpxSym?: string } | null => {
  if (!ref || !_symbolRegistry) {
    return null;
  }
  return _symbolRegistry.getGpxMapping(ref);
};

/**
 * @description Compute the value to persist as a waypoint's skIcon for a
 * selected built-in/external icon.
 * - Qualified refs ("namespace:id", "default:id") are saved as-is.
 * - A bare built-in id is pinned to "default:<id>" when an external override
 *   exists (so a future custom version won't silently replace this selection);
 *   otherwise it is saved bare.
 */
export const persistSkIcon = (svgIcon?: string): string => {
  const id = svgIcon ?? '';
  if (!id || id.includes(':')) {
    return id;
  }
  if (_symbolRegistry && _symbolRegistry.hasExternalVersion(id)) {
    return `default:${id}`;
  }
  return id;
};

export interface AppIconSet {
  path: string;
  files: Array<string>;
  scale?: number;
  anchor?: [number, number];
}

export interface AppIconDef {
  class?: string;
  svgIcon?: string;
  name?: string;
}

/** Return a list of SVG Icons
 * @description Builds a list of SVG Icons for loading into the IconRegistry
 * @returns Array of files (including path)
 */
export const getSvgList = (): Array<{ id: string; path: string }> => {
  const svgList: Array<{ id: string; path: string }> = [];

  const addToList = (list: AppIconSet, prefix?: string) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.lastIndexOf('.'));
      svgList.push({
        id: `${prefix ?? ''}${id}`,
        path: `${list.path}/${file}`
      });
    });
  };
  addToList(OpenBridgeIcons);
  addToList(PoiIcons);
  addToList(VesselAisIcons);
  addToList(WaypointIcons);
  addToList(AtoNsType1);
  // Fallback icon for unresolvable symbol references
  svgList.push({ id: 'no-such-symbol', path: './assets/img/no-such-symbol.svg' });
  return svgList;
};

/**
 * Set of all built-in icon ids (bare names, default namespace).
 * Populated lazily on first call; used by SymbolService for resolution.
 */
let _builtinIconIds: Set<string> | null = null;
export const getBuiltinIconIds = (): Set<string> => {
  if (!_builtinIconIds) {
    _builtinIconIds = new Set(getSvgList().map((s) => s.id));
  }
  return _builtinIconIds;
};

/**
 * @description Return an icon definition that can be used to assign a mat-icon for a resource
 * @param resourceType The type of resource supplied 'route' | 'waypoint' | 'region' | 'note'
 * @param resource Signal K resource
 * @returns Icon definition object
 */
export const getResourceIcon = (
  resourceType: SKResourceType,
  resource?: SKRoute | SKWaypoint | SKRegion | SKNote | string
): AppIconDef => {
  if (resourceType === 'routes') {
    return { class: 'icon-route', svgIcon: 'route', name: undefined };
  }
  if (resourceType === 'regions') {
    let iconDef = {
      class: 'icon-region',
      svgIcon: undefined,
      name: 'tab_unselected'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string'
        ? resource
        : (resource as SKRegion).feature.properties?.skIcon;
    if (!icon) {
      return iconDef;
    }
    // Route through symbol registry if available
    if (_symbolRegistry) {
      const resolved = _symbolRegistry.resolveDisplayIcon(icon);
      if (resolved) return { class: undefined, ...resolved, name: undefined };
    }
    return { class: undefined, svgIcon: `${icon}`, name: undefined };
  }
  if (resourceType === 'notes') {
    let iconDef = {
      class: 'icon-accent',
      svgIcon: undefined,
      name: 'local_offer'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string'
        ? resource
        : (resource as SKNote).properties?.skIcon;
    if (!icon) {
      return iconDef;
    }
    // Route through symbol registry if available
    if (_symbolRegistry) {
      const resolved = _symbolRegistry.resolveDisplayIcon(icon);
      if (resolved) return { class: undefined, ...resolved, name: undefined };
    }
    return { class: undefined, svgIcon: `${icon}`, name: undefined };
  }
  if (resourceType === 'waypoints') {
    const wptDefs = getWaypointDefs();
    const skIcon =
      typeof resource === 'string' || typeof resource === 'undefined'
        ? undefined
        : ((resource as SKWaypoint).feature.properties?.skIcon ?? undefined);
    const wptType =
      typeof resource === 'string' || typeof resource === 'undefined'
        ? resource
        : (resource as SKWaypoint).type;
    const wid = skIcon ?? wptType ?? 'default';

    if (!resource || wid === 'default') {
      return {
        class: undefined,
        svgIcon: 'waypoint',
        name: undefined
      };
    }
    // Only the 'waypoint' type participates in symbol overrides; other types
    // (start-pin, pseudoaton, …) always render their built-in icon. Ignore the
    // 'no-such-symbol' fallback so an unresolved/foreign value (e.g. a GPX
    // <type>) falls back to the default waypoint icon, not the missing marker.
    if (_symbolRegistry && wptType === 'waypoint') {
      const resolved = _symbolRegistry.resolveDisplayIcon(wid);
      if (resolved && resolved.svgIcon !== 'no-such-symbol') {
        return { class: undefined, ...resolved, name: undefined };
      }
    }
    if (!wptDefs[wid]) {
      return {
        class: undefined,
        svgIcon: 'waypoint',
        name: undefined
      };
    }
    return {
      class: undefined,
      svgIcon: wid,
      name: undefined
    };
  }
};

/**
 * @description Resolve a skIcon reference to a Material-resolvable svgIcon name,
 * applying external-symbol overrides when the registry is present. Returns the
 * input unchanged when no registry/override applies.
 * Used by list/panel views that bind skIcon directly to <mat-icon [svgIcon]>.
 */
export const resolveSkIcon = (ref?: string): string => {
  if (!ref) {
    return ref ?? '';
  }
  if (_symbolRegistry) {
    const resolved = _symbolRegistry.resolveDisplayIcon(ref);
    if (resolved?.svgIcon) {
      return resolved.svgIcon;
    }
  }
  return ref;
};

/**
 * @description Return an icon definition for an Alert
 * @param alert AlertData object
 * @returns Icon Definition object
 */
export const getAlertIcon = (alert: AlertData): AppIconDef => {
  if (
    ['mob', 'fire', 'abandon', 'aground', 'cpa', 'depth'].includes(alert.type)
  ) {
    return {
      class: 'ob',
      svgIcon: `alarm-${alert.type}`,
      name: undefined
    };
  } else if (alert.type === 'arrivalCircleEntered') {
    return {
      class: undefined,
      svgIcon: `alarm-arrival`,
      name: 'arrival'
    };
  } else if (alert.type === 'anchor') {
    return {
      class: undefined,
      svgIcon: undefined,
      name: 'anchor'
    };
  } else if (alert.type === 'meteo') {
    return {
      class: undefined,
      svgIcon: undefined,
      name: 'air'
    };
  } else if (alert.priority === 'warn') {
    return {
      class: 'ob',
      svgIcon: 'warning-unack-iec',
      name: undefined
    };
  } else if (['emergency', 'alarm'].includes(alert.priority)) {
    const icon = alert.acknowledged
      ? 'alarm-acknowledged-iec'
      : alert.silenced
        ? 'alarm-silenced-iec'
        : 'alarm-acknowledged-iec';
    return {
      class: undefined,
      svgIcon: icon,
      name: undefined
    };
  } else {
    const icon = alert.acknowledged
      ? 'warning-acknowledged-iec'
      : alert.silenced
        ? 'warning-silenced-iec'
        : 'warning-unack-iec';
    return {
      class: undefined,
      svgIcon: icon,
      name: undefined
    };
  }
};

/**
 * @description Return an icon definition for an AIS vessel
 * @param id AIS shipType
 * @returns Icon Definition object
 */
export const getAisIcon = (id: number | string): AppIconDef => {
  if (typeof id === 'number') {
    id = Math.floor(id / 10) * 10;
  }
  if (!id || !(id in AIS_TYPE_IDS)) {
    return {
      class: undefined,
      svgIcon: AIS_TYPE_IDS['default'],
      name: 'default'
    };
  } else {
    return {
      class: undefined,
      svgIcon: AIS_TYPE_IDS[id],
      name: id.toString()
    };
  }
};

/**
 * @description Return a list of Note icon selection options.
 * Built-in POIs are shown resolved: an overridden POI shows its override and the
 * built-in default is hidden. Note-role external symbols with new ids are also
 * shown. When showAll is true, the list also includes external symbols of any
 * role plus a "default" entry for each built-in that has been overridden.
 */
export const selListNoteIcons = (
  showAll = false
): Array<{ id: string; name: string }> => {
  const icons: Array<{ id: string; name: string }> = [
    { id: '', name: `local_offer` }
  ];

  // Built-in POIs, resolved (override hides the default; persistSkIcon() decides
  // the saved value when one is selected).
  PoiIcons.files.forEach((file: string) => {
    const name = file.slice(0, file.lastIndexOf('.'));
    icons.push({ id: _symbolRegistry ? resolveSkIcon(name) : name, name });
  });

  if (_symbolRegistry) {
    const builtins = getBuiltinIconIds();
    const localId = (ref: string) =>
      ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
    const isNewId = (i: { id: string }) => !builtins.has(localId(i.id));

    // Note-role external symbols with a new id (overrides already shown above).
    const noteSymbols = _symbolRegistry
      .getExternalNoteIcons(false)
      .filter(isNewId);
    icons.push(...noteSymbols);

    if (showAll) {
      // Remaining external symbols of any role, also with new ids.
      const noteRefs = new Set(noteSymbols.map((s) => s.id));
      const otherSymbols = _symbolRegistry
        .getExternalNoteIcons(true)
        .filter(isNewId)
        .filter((s) => !noteRefs.has(s.id));
      icons.push(...otherSymbols);

      // "default" entries for overridden built-in POIs (saved as default:<id>).
      const replacedDefaults = PoiIcons.files
        .map((f) => f.slice(0, f.lastIndexOf('.')))
        .filter((id) => _symbolRegistry.hasExternalVersion(id))
        .map((id) => ({ id, name: id }));
      icons.push(...replacedDefaults);
    }
  }
  return icons;
};

/**
 * @description Return a list of Waypoint icon selection options.
 * Only the "Waypoints" category supports external symbols. External symbols
 * with the 'waypoint' role appear there; an override of a built-in replaces the
 * built-in in place (its default is hidden). When showAll is true, the group
 * also includes external symbols of any role plus a "default:" entry for each
 * built-in that has been overridden (so the built-in can still be chosen).
 * The other categories (Pseudo AtoN, Sightings, …) are built-in only.
 */
export const selListWaypointIcons = (
  showAll = false
): Record<
  string,
  {
    group: string;
    icons: Array<AppIconDef>;
  }
> => {
  const iconList: Record<string, { group: string; icons: Array<AppIconDef> }> = {
    waypoint: {
      group: 'Waypoints',
      icons: [getResourceIcon('waypoints', 'waypoint')]
    },
    pseudoaton: {
      group: 'Pseudo AtoN',
      icons: [getResourceIcon('waypoints', 'pseudoaton')]
    },
    whale: {
      group: 'Sightings',
      icons: [getResourceIcon('waypoints', 'whale')]
    },
    pob: {
      group: 'Alarms',
      icons: [getResourceIcon('waypoints', 'pob')]
    },
    'start-boat': {
      group: 'Start Boat',
      icons: [getResourceIcon('waypoints', 'start-boat')]
    },
    'start-pin': {
      group: 'Start Pin',
      icons: [getResourceIcon('waypoints', 'start-pin')]
    }
  };

  iconList.waypoint.icons = iconList.waypoint.icons.concat(
    PoiIcons.files.map((file: string) => {
      const name = file.slice(0, file.lastIndexOf('.'));
      return getResourceIcon('notes', name);
    })
  );

  iconList.pseudoaton.icons = iconList.pseudoaton.icons.concat(
    AtoNsType1.files.map((file: string) => {
      const name = file.slice(0, file.lastIndexOf('.'));
      return getResourceIcon('waypoints', name);
    })
  );

  if (_symbolRegistry) {
    const builtins = getBuiltinIconIds();
    const localId = (ref: string) =>
      ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
    // Overrides of a built-in are already shown via the resolved built-in/POI
    // entry above, so exclude them here to avoid listing the same id twice.
    const isNewId = (i: AppIconDef) => !builtins.has(localId(i.svgIcon ?? ''));

    // Waypoint-role external symbols with a new id (no built-in counterpart).
    const wptSymbols = _symbolRegistry
      .getExternalWaypointIcons(false)
      .filter(isNewId);
    iconList.waypoint.icons = iconList.waypoint.icons.concat(wptSymbols);

    if (showAll) {
      // Remaining external symbols of any role, also with new ids.
      const wptRefs = new Set(wptSymbols.map((s) => s.svgIcon));
      const otherSymbols = _symbolRegistry
        .getExternalWaypointIcons(true)
        .filter(isNewId)
        .filter((s) => !wptRefs.has(s.svgIcon));
      iconList.waypoint.icons = iconList.waypoint.icons.concat(otherSymbols);

      // "default:" entries for built-ins that have been overridden, so the
      // built-in version can still be chosen. Display uses the bare id (built-in
      // artwork); persistSkIcon() saves it as default:<id>.
      const waypointBuiltinIds = [
        'waypoint',
        ...PoiIcons.files.map((f) => f.slice(0, f.lastIndexOf('.')))
      ];
      const replacedDefaults = waypointBuiltinIds
        .filter((id) => _symbolRegistry.hasExternalVersion(id))
        .map((id) => ({ svgIcon: id, name: id }));
      iconList.waypoint.icons = iconList.waypoint.icons.concat(replacedDefaults);
    }
  }

  return iconList;
};
