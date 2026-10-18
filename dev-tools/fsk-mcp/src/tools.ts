// The MCP tool surface exposed to the agent.
//
// ────────────────────────────────────────────────────────────────────────────
//  KEEP IN SYNC WITH THE PLOTTER EXTENSIONS HOST API.
//  When you add or change a host API method in Freeboard-SK
//  (docs/api/plotter-extensions-api.md — the "Host API" table), add or update
//  the matching curated tool below so agents get a clean, discoverable schema
//  for it. `fsk_call` already reaches any method generically; the curated tools
//  are for ergonomics and discoverability, and this file is the single place
//  they live.
// ────────────────────────────────────────────────────────────────────────────
//
// Each tool declares a JSON Schema `inputSchema` and a `run(hub, args)` that
// relays to a host-API method over the bridge. `session` selects which
// connected Freeboard tab to drive; omit it to use the most recent.

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { BridgeHub } from './bridge-hub.ts';

export type ToolHub = Pick<BridgeHub, 'call' | 'listSessions'>;
export type ToolArgs = Record<string, unknown>;
type InputSchema = Tool['inputSchema'];

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: InputSchema;
  run(hub: ToolHub, args: ToolArgs): unknown;
}

type Session = { session?: string };

type OpenWindowArgs = Session & {
  url?: string;
  bare?: boolean;
  title?: string;
  geometry?: object;
  modal?: boolean;
  resizable?: boolean;
  movable?: boolean;
  titleBar?: 'fixed' | 'autoHide';
  userClose?: 'close' | 'hide';
  visible?: boolean;
  restoreKey?: string;
};

// The low-level MCP Server does not check arguments against `inputSchema`, so
// a tool reads them as the shape its schema advertises and the host API
// rejects anything it cannot use.
function tool<A extends ToolArgs>(def: {
  name: string;
  description: string;
  inputSchema: InputSchema;
  run: (hub: ToolHub, args: A) => unknown;
}): ToolDef {
  return { ...def, run: (hub, args) => def.run(hub, args as A) };
}

const SESSION_PROP = {
  session: {
    type: 'string',
    description:
      'Which connected Freeboard-SK runtime to target (from fsk_list_sessions). Omit to use the most recently connected one.'
  }
};

// Merge the shared `session` property into a tool's own properties.
function withSession(
  properties: Record<string, object> = {},
  required: string[] = []
): InputSchema {
  return {
    type: 'object',
    properties: { ...properties, ...SESSION_PROP },
    required,
    additionalProperties: false
  };
}

// A Plotter Extensions window geometry request (capability `windows`).
const GEOMETRY_SCHEMA = {
  type: 'object',
  description:
    'Requested size and position, relative to the window area: { anchor?, offset?: { x?, y? }, width?, height?, minWidth?, minHeight?, maxWidth?, maxHeight? }. anchor is top-left | top-center | top-right | center-left | center | center-right | bottom-left | bottom-center | bottom-right; offset is measured inward from the anchored edges; lengths are CSS px numbers or percentage strings such as "40%". The host clamps it and reports the actual bounds.'
};

export const TOOLS: ToolDef[] = [
  tool({
    name: 'fsk_list_sessions',
    description:
      'List the connected Freeboard-SK runtimes (each open tab is one session). Returns each session id, the host name/version, its advertised capabilities, and when it connected. Use a session id with the other tools to target a specific tab.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    run: (hub) => hub.listSessions()
  }),
  tool({
    name: 'fsk_call',
    description:
      'Generic escape hatch: call ANY Plotter Extensions host API method on the target Freeboard-SK runtime and return its result. Use this for methods without a dedicated tool (route.create, route.save, signalk.put, ui.openPanel, units.get, and any method added to the host API later). See docs/api/plotter-extensions-api.md for the method table.',
    inputSchema: withSession(
      {
        method: {
          type: 'string',
          description:
            'Host API method name, e.g. "map.getView", "route.list", "resources.setFilter".'
        },
        params: {
          type: 'object',
          description:
            'Parameters object for the method (shape per the host API spec).'
        }
      },
      ['method']
    ),
    run: (hub, a: Session & { method: string; params?: unknown }) =>
      hub.call(a.method, a.params ?? {}, { session: a.session })
  }),
  tool({
    name: 'fsk_publish',
    description:
      "Publish an event onto the Freeboard-SK extension bus (capability `events.publish`), e.g. to poke an extension's background runtime the way its toolbar button would. Subscribers receive it exactly like a host event. It is published as the bridge's own extension (fsk-mcp), so use scope 'all' (the default) to reach other extensions; scope 'extension' would reach only the bridge itself. Topics are literal names (no '*', not bus.*), conventionally '<extension-id>.<name>'.",
    inputSchema: withSession(
      {
        topic: {
          type: 'string',
          description: 'Event name to publish, e.g. "poi-search.refresh".'
        },
        params: {
          description:
            'Optional payload, delivered unchanged as the event params.'
        },
        scope: {
          type: 'string',
          enum: ['all', 'extension'],
          description:
            "Who may receive it. Default 'all' (every subscribed context)."
        }
      },
      ['topic']
    ),
    run: (
      hub,
      a: Session & {
        topic: string;
        params?: unknown;
        scope?: 'all' | 'extension';
      }
    ) => {
      const params: { topic: string; params?: unknown; scope?: string } = {
        topic: a.topic
      };
      if (a.params !== undefined) params.params = a.params;
      if (a.scope) params.scope = a.scope;
      return hub.call('events.publish', params, { session: a.session });
    }
  }),
  tool({
    name: 'fsk_get_view',
    description:
      'Read the current map view (center [lon,lat], zoom, and bounds [west,south,east,north]) from Freeboard-SK. Longitudes are in [-180,180]; a view across the antimeridian has west > east. Handy for verifying the effect of a fsk_set_view / fsk_fit_bounds call.',
    inputSchema: withSession(),
    run: (hub, a: Session) =>
      hub.call('map.getView', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_set_view',
    description:
      'Center the Freeboard-SK map on a coordinate, optionally setting the zoom level. Longitude/latitude are in decimal degrees; zoom is a slippy-map zoom (roughly 1=world … 20=street).',
    inputSchema: withSession(
      {
        longitude: {
          type: 'number',
          description: 'Center longitude, decimal degrees (-180..180).'
        },
        latitude: {
          type: 'number',
          description: 'Center latitude, decimal degrees (-90..90).'
        },
        zoom: { type: 'number', description: 'Optional target zoom level.' }
      },
      ['longitude', 'latitude']
    ),
    run: (
      hub,
      a: Session & { longitude: number; latitude: number; zoom?: number }
    ) =>
      hub.call(
        'map.center',
        a.zoom === undefined
          ? { position: [a.longitude, a.latitude] }
          : { position: [a.longitude, a.latitude], zoom: a.zoom },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_fit_bounds',
    description:
      'Fit the Freeboard-SK map to a bounding box so the whole box is visible. Coordinates are decimal degrees; minLon is the west edge and maxLon the east edge. For a box across the antimeridian pass minLon > maxLon (e.g. 175 and -175) or an unwrapped maxLon past 180 (e.g. 175 and 185); either is fitted the short way round.',
    inputSchema: withSession(
      {
        minLon: { type: 'number' },
        minLat: { type: 'number' },
        maxLon: { type: 'number' },
        maxLat: { type: 'number' }
      },
      ['minLon', 'minLat', 'maxLon', 'maxLat']
    ),
    run: (
      hub,
      a: Session & {
        minLon: number;
        minLat: number;
        maxLon: number;
        maxLat: number;
      }
    ) =>
      hub.call(
        'map.fitBounds',
        { bounds: [a.minLon, a.minLat, a.maxLon, a.maxLat] },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_list_resources',
    description:
      "Query a Signal K resource collection through the host's authenticated session (relayed resources.list). Optionally pass a query object, e.g. { position: [lon,lat], distance: 18520 }.",
    inputSchema: withSession(
      {
        type: {
          type: 'string',
          description: 'Resource type, e.g. "routes", "notes", "waypoints".'
        },
        query: {
          type: 'object',
          description: 'Optional query parameters for the collection.'
        }
      },
      ['type']
    ),
    run: (hub, a: Session & { type: string; query?: object }) =>
      hub.call(
        'resources.list',
        a.query ? { type: a.type, query: a.query } : { type: a.type },
        {
          session: a.session
        }
      )
  }),
  tool({
    name: 'fsk_set_filter',
    description:
      'Set a display-only filter for a resource type so Freeboard shows only (or hides) matching resources. Never modifies stored resources. `filter` follows the host API shape: { mode: "include"|"exclude", ids?, match?, label? }.',
    inputSchema: withSession(
      {
        type: {
          type: 'string',
          description: 'Resource type to filter, e.g. "notes".'
        },
        filter: {
          type: 'object',
          description: 'Filter object per the host API (mode/ids/match/label).'
        }
      },
      ['type', 'filter']
    ),
    run: (hub, a: Session & { type: string; filter: object }) =>
      hub.call(
        'resources.setFilter',
        { type: a.type, filter: a.filter },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_clear_filter',
    description:
      "Clear this tool's display filter for a resource type in Freeboard-SK.",
    inputSchema: withSession({ type: { type: 'string' } }, ['type']),
    run: (hub, a: Session & { type: string }) =>
      hub.call(
        'resources.clearFilter',
        { type: a.type },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_list_routes',
    description:
      'List the routes currently visible on the Freeboard-SK chart (the small "visible set", not the whole stored catalogue). Each entry includes its opaque routeId plus saved/dirty flags.',
    inputSchema: withSession(),
    run: (hub, a: Session) => hub.call('route.list', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_get_route',
    description:
      'Get the full detail (name, description, points, rev, saved/dirty) of one visible route by its routeId (from fsk_list_routes).',
    inputSchema: withSession({ routeId: { type: 'string' } }, ['routeId']),
    run: (hub, a: Session & { routeId: string }) =>
      hub.call('route.get', { routeId: a.routeId }, { session: a.session })
  }),
  tool({
    name: 'fsk_list_charts',
    description:
      'List the chart layers Freeboard-SK manages, in display order (topmost first). Each entry has an opaque id, name, visible flag, opacity (0..1) and best-effort type/bounds/zoom range. A time-varying chart (weather radar, satellite) also carries `time`: { value (ISO instant shown, or null = live), current, from?, to?, step?, values? }. This is also how you read the current stacking order.',
    inputSchema: withSession(),
    run: (hub, a: Session) => hub.call('chart.list', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_set_chart_visibility',
    description:
      'Show or hide one or more chart layers by id (from fsk_list_charts). Idempotent — charts already in the requested state are unchanged.',
    inputSchema: withSession(
      {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Chart ids to show/hide.'
        },
        visible: {
          type: 'boolean',
          description: 'true to show, false to hide.'
        }
      },
      ['ids', 'visible']
    ),
    run: (hub, a: Session & { ids: string[]; visible: boolean }) =>
      hub.call(
        'chart.setVisibility',
        { ids: a.ids, visible: a.visible },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_set_chart_opacity',
    description:
      'Set the display opacity (0..1) of one or more chart layers by id (from fsk_list_charts).',
    inputSchema: withSession(
      {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Chart ids to retint.'
        },
        opacity: { type: 'number', description: 'Opacity, 0..1.' }
      },
      ['ids', 'opacity']
    ),
    run: (hub, a: Session & { ids: string[]; opacity: number }) =>
      hub.call(
        'chart.setOpacity',
        { ids: a.ids, opacity: a.opacity },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_set_chart_order',
    description:
      'Set the chart display/stacking order from a topmost-first list of chart ids (from fsk_list_charts). Ids you omit keep their relative order below the named ones. Order is host-clamped.',
    inputSchema: withSession(
      {
        order: {
          type: 'array',
          items: { type: 'string' },
          description: 'Chart ids, topmost first.'
        }
      },
      ['order']
    ),
    run: (hub, a: Session & { order: string[] }) =>
      hub.call('chart.setOrder', { order: a.order }, { session: a.session })
  }),
  tool({
    name: 'fsk_set_chart_time',
    description:
      "Show one or more time-varying chart layers (those with a `time` object in fsk_list_charts) at an instant, or return them to live. The instant is passed through to the chart source unchanged, so pick one from the chart's `time.values` / `from`..`to` at `step`. Emits chart.time per changed chart. Fails with charts.notTemporal for a chart with no time dimension.",
    inputSchema: withSession(
      {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Chart ids to retarget.'
        },
        time: {
          type: ['string', 'null'],
          description:
            'ISO 8601 instant (e.g. "2026-09-18T14:35:00Z"), or null for the live/current frame.'
        }
      },
      ['ids', 'time']
    ),
    run: (hub, a: Session & { ids: string[]; time: string | null }) =>
      hub.call(
        'chart.setTime',
        { ids: a.ids, time: a.time },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_get_night_mode',
    description:
      "Read Freeboard-SK's night-mode state: { enabled, auto }. `enabled` is whether the dimmed night-vision display is currently applied; `auto` is whether it follows the server's environment.mode (day/night).",
    inputSchema: withSession(),
    run: (hub, a: Session) =>
      hub.call('nightMode.get', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_set_night_mode',
    description:
      "Control Freeboard-SK's night mode. Force on with { enabled: true }, force off with { enabled: false }, or follow the server's environment.mode with { auto: true }. Setting `enabled` is a manual override and turns `auto` off. Supply at least one field.",
    inputSchema: withSession({
      enabled: {
        type: 'boolean',
        description:
          'Force night mode on (true) or off (false). Implies auto:false.'
      },
      auto: {
        type: 'boolean',
        description:
          'Follow the server environment.mode (true) or stop following (false).'
      }
    }),
    run: (hub, a: Session & { enabled?: boolean; auto?: boolean }) => {
      const params: { enabled?: boolean; auto?: boolean } = {};
      if (typeof a.enabled === 'boolean') params.enabled = a.enabled;
      if (typeof a.auto === 'boolean') params.auto = a.auto;
      return hub.call('nightMode.set', params, { session: a.session });
    }
  }),
  tool({
    name: 'fsk_apply_resource_group',
    description:
      "Apply a stored resource group (/resources/groups/{id}) to Freeboard-SK's display — the same as checking it in the Resource Groups list. Each of the group's routes/waypoints/regions/charts lists replaces that type's selection ([] hides the type); an absent list leaves the type alone. Returns { applied }: the types acted on. List groups with fsk_list_resources({ type: 'groups' }).",
    inputSchema: withSession(
      {
        id: {
          type: 'string',
          description: 'Id of the group in the server groups collection.'
        }
      },
      ['id']
    ),
    run: (hub, a: Session & { id: string }) =>
      hub.call('resourceGroup.apply', { id: a.id }, { session: a.session })
  }),
  tool({
    name: 'fsk_open_window',
    description:
      "Open a Plotter Extensions window floating over the Freeboard-SK chart (capability `windows`). An extension can only show its own panels in windows, so this opens the bridge's own panel, the window probe, which shows its window context and, given `url`, embeds that page from the Signal K server (e.g. '/signalk-wifish/' or '/@signalk/instrumentpanel/'). Returns the window state: { windowId, presentation, bounds, area, visible, collapsed, modal, … }.",
    inputSchema: withSession({
      url: {
        type: 'string',
        description:
          "A page on the Signal K server for the probe to embed (server-relative, starting with '/'). Optional."
      },
      bare: {
        type: 'boolean',
        description:
          "Show only the `url` page, without the probe's context readout and Close button: what a real extension window looks like."
      },
      title: { type: 'string', description: 'Title-bar text.' },
      geometry: GEOMETRY_SCHEMA,
      modal: {
        type: 'boolean',
        description:
          'Block the chart and every other window until closed (Escape closes it).'
      },
      resizable: {
        type: 'boolean',
        description: 'Whether the user may resize it (default true).'
      },
      movable: {
        type: 'boolean',
        description: 'Whether the user may move it (default true).'
      },
      titleBar: {
        type: 'string',
        enum: ['fixed', 'autoHide'],
        description: 'autoHide fades the title bar when idle.'
      },
      userClose: {
        type: 'string',
        enum: ['close', 'hide'],
        description: "What the window's own close control does (default close)."
      },
      visible: {
        type: 'boolean',
        description: 'false opens it hidden but running.'
      },
      restoreKey: {
        type: 'string',
        description:
          'Remember the geometry the user gives it under this key (per device).'
      }
    }),
    run: (hub, a: OpenWindowArgs) => {
      const params: Record<string, unknown> = { panel: 'window-probe' };
      if (a.url || a.bare) {
        params.params = {
          ...(a.url ? { url: a.url } : {}),
          ...(a.bare ? { bare: true } : {})
        };
      }
      for (const k of [
        'title',
        'geometry',
        'modal',
        'resizable',
        'movable',
        'titleBar',
        'userClose',
        'visible',
        'restoreKey'
      ] as const) {
        if (a[k] !== undefined) params[k] = a[k];
      }
      return hub.call('ui.openWindow', params, { session: a.session });
    }
  }),
  tool({
    name: 'fsk_update_window',
    description:
      'Change a window the bridge opened: retitle it, move or resize it (geometry fields given replace the current ones), or show / hide it (`visible`). Returns its new state.',
    inputSchema: withSession(
      {
        windowId: {
          type: 'string',
          description: 'From fsk_open_window or fsk_list_windows.'
        },
        title: { type: 'string' },
        geometry: GEOMETRY_SCHEMA,
        visible: { type: 'boolean' }
      },
      ['windowId']
    ),
    run: (
      hub,
      a: Session & {
        windowId: string;
        title?: string;
        geometry?: object;
        visible?: boolean;
      }
    ) => {
      const params: Record<string, unknown> = { windowId: a.windowId };
      for (const k of ['title', 'geometry', 'visible'] as const) {
        if (a[k] !== undefined) params[k] = a[k];
      }
      return hub.call('ui.updateWindow', params, { session: a.session });
    }
  }),
  tool({
    name: 'fsk_list_overlays',
    description:
      "List the bridge's own map overlays: { id, title, type, band, visible, opacity, suspended } and, for a data overlay, `skippedLayers` — the style layers the host could not draw, each { id, reason: layerType | property | source, detail? }. The overlay methods reach only the caller's own overlays, so this lists the bridge's scratch layer (id `scratch`), a data overlay whose style draws any GeoJSON you give it.",
    inputSchema: withSession(),
    run: (hub, a: Session) =>
      hub.call('overlay.list', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_set_overlay_data',
    description:
      "Draw GeoJSON on the chart through the bridge's scratch layer (overlayId `scratch`, source `scratch`), showing the layer if it is hidden. Pass `data` to replace every feature, or `upsert` (features, each with a top-level `id`) and/or `remove` (ids) to change some. Points draw as circles, lines and polygon outlines as lines, polygons filled; a feature's `color` and `label` properties set its colour and label.",
    inputSchema: withSession({
      overlayId: { type: 'string', description: 'Default `scratch`.' },
      source: { type: 'string', description: 'Default `scratch`.' },
      data: {
        type: 'object',
        description: 'A GeoJSON object (usually a FeatureCollection).'
      },
      upsert: {
        type: 'array',
        items: { type: 'object' },
        description: 'Features to add or replace by `id`.'
      },
      remove: {
        type: 'array',
        items: { type: ['string', 'number'] },
        description: 'Ids of features to remove.'
      }
    }),
    run: async (
      hub,
      a: Session & {
        overlayId?: string;
        source?: string;
        data?: object;
        upsert?: object[];
        remove?: (string | number)[];
      }
    ) => {
      const overlayId = a.overlayId ?? 'scratch';
      const result = await hub.call(
        'overlay.setData',
        {
          overlayId,
          source: a.source ?? 'scratch',
          ...(a.data !== undefined ? { data: a.data } : {}),
          ...(a.upsert !== undefined ? { upsert: a.upsert } : {}),
          ...(a.remove !== undefined ? { remove: a.remove } : {})
        },
        { session: a.session }
      );
      // the scratch layer starts hidden (manifest.js); drawing on it shows it
      if (overlayId === 'scratch') {
        await hub.call(
          'overlay.setVisibility',
          { ids: ['scratch'], visible: true },
          { session: a.session }
        );
      }
      return result;
    }
  }),
  tool({
    name: 'fsk_set_overlay_state',
    description:
      "Set `global-state` variables of one of the bridge's data overlays (overlay.setState); null restores a variable's default. The scratch layer reads `color`, the colour of features without their own.",
    inputSchema: withSession(
      {
        overlayId: { type: 'string', description: 'Default `scratch`.' },
        values: {
          type: 'object',
          description: 'Variable name → value, e.g. { "color": "#00c853" }.'
        }
      },
      ['values']
    ),
    run: (hub, a: Session & { overlayId?: string; values: object }) =>
      hub.call(
        'overlay.setState',
        { overlayId: a.overlayId ?? 'scratch', values: a.values },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_set_overlay_layer',
    description:
      "Change one layer of one of the bridge's data overlays (overlay.setLayer): each named paint or layout property replaces the current one (null restores the style's), `filter` replaces the filter (null removes it). A change the host cannot draw fails with overlays.unsupported and the layer is left as it was. Scratch layers: areas, lines, points, labels.",
    inputSchema: withSession(
      {
        overlayId: { type: 'string', description: 'Default `scratch`.' },
        layer: { type: 'string', description: 'The style layer id.' },
        paint: { type: 'object', description: 'Paint properties to set.' },
        layout: { type: 'object', description: 'Layout properties to set.' },
        filter: {
          type: ['array', 'null'],
          description: 'A filter expression, or null to remove the filter.'
        }
      },
      ['layer']
    ),
    run: (
      hub,
      a: Session & {
        overlayId?: string;
        layer: string;
        paint?: object;
        layout?: object;
        filter?: unknown[] | null;
      }
    ) =>
      hub.call(
        'overlay.setLayer',
        {
          overlayId: a.overlayId ?? 'scratch',
          layer: a.layer,
          ...(a.paint !== undefined ? { paint: a.paint } : {}),
          ...(a.layout !== undefined ? { layout: a.layout } : {}),
          ...(a.filter !== undefined ? { filter: a.filter } : {})
        },
        { session: a.session }
      )
  }),
  tool({
    name: 'fsk_list_windows',
    description:
      'List the windows the bridge has open in Freeboard-SK, hidden ones included, with their actual bounds and state.',
    inputSchema: withSession(),
    run: (hub, a: Session) =>
      hub.call('ui.listWindows', {}, { session: a.session })
  }),
  tool({
    name: 'fsk_close_window',
    description: 'Close a window the bridge opened.',
    inputSchema: withSession(
      {
        windowId: {
          type: 'string',
          description: 'From fsk_open_window or fsk_list_windows.'
        }
      },
      ['windowId']
    ),
    run: (hub, a: Session & { windowId: string }) =>
      hub.call(
        'ui.closeWindow',
        { windowId: a.windowId },
        { session: a.session }
      )
  })
];
