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

const SESSION_PROP = {
  session: {
    type: 'string',
    description:
      'Which connected Freeboard-SK runtime to target (from fsk_list_sessions). Omit to use the most recently connected one.'
  }
};

// Merge the shared `session` property into a tool's own properties.
function withSession(properties = {}, required = []) {
  return {
    type: 'object',
    properties: { ...properties, ...SESSION_PROP },
    required,
    additionalProperties: false
  };
}

const TOOLS = [
  {
    name: 'fsk_list_sessions',
    description:
      'List the connected Freeboard-SK runtimes (each open tab is one session). Returns each session id, the host name/version, its advertised capabilities, and when it connected. Use a session id with the other tools to target a specific tab.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    run: (hub) => hub.listSessions()
  },
  {
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
    run: (hub, a) => hub.call(a.method, a.params ?? {}, { session: a.session })
  },
  {
    name: 'fsk_get_view',
    description:
      'Read the current map view (center [lon,lat], zoom, and bounds) from Freeboard-SK. Handy for verifying the effect of a fsk_set_view / fsk_fit_bounds call.',
    inputSchema: withSession(),
    run: (hub, a) => hub.call('map.getView', {}, { session: a.session })
  },
  {
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
    run: (hub, a) =>
      hub.call(
        'map.center',
        a.zoom === undefined
          ? { position: [a.longitude, a.latitude] }
          : { position: [a.longitude, a.latitude], zoom: a.zoom },
        { session: a.session }
      )
  },
  {
    name: 'fsk_fit_bounds',
    description:
      'Fit the Freeboard-SK map to a bounding box so the whole box is visible. Coordinates are decimal degrees.',
    inputSchema: withSession(
      {
        minLon: { type: 'number' },
        minLat: { type: 'number' },
        maxLon: { type: 'number' },
        maxLat: { type: 'number' }
      },
      ['minLon', 'minLat', 'maxLon', 'maxLat']
    ),
    run: (hub, a) =>
      hub.call(
        'map.fitBounds',
        { bounds: [a.minLon, a.minLat, a.maxLon, a.maxLat] },
        { session: a.session }
      )
  },
  {
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
    run: (hub, a) =>
      hub.call(
        'resources.list',
        a.query ? { type: a.type, query: a.query } : { type: a.type },
        {
          session: a.session
        }
      )
  },
  {
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
    run: (hub, a) =>
      hub.call(
        'resources.setFilter',
        { type: a.type, filter: a.filter },
        { session: a.session }
      )
  },
  {
    name: 'fsk_clear_filter',
    description:
      "Clear this tool's display filter for a resource type in Freeboard-SK.",
    inputSchema: withSession({ type: { type: 'string' } }, ['type']),
    run: (hub, a) =>
      hub.call(
        'resources.clearFilter',
        { type: a.type },
        { session: a.session }
      )
  },
  {
    name: 'fsk_list_routes',
    description:
      'List the routes currently visible on the Freeboard-SK chart (the small "visible set", not the whole stored catalogue). Each entry includes its opaque routeId plus saved/dirty flags.',
    inputSchema: withSession(),
    run: (hub, a) => hub.call('route.list', {}, { session: a.session })
  },
  {
    name: 'fsk_get_route',
    description:
      'Get the full detail (name, description, points, rev, saved/dirty) of one visible route by its routeId (from fsk_list_routes).',
    inputSchema: withSession({ routeId: { type: 'string' } }, ['routeId']),
    run: (hub, a) =>
      hub.call('route.get', { routeId: a.routeId }, { session: a.session })
  },
  {
    name: 'fsk_list_charts',
    description:
      'List the chart layers Freeboard-SK manages, in display order (topmost first). Each entry has an opaque id, name, visible flag, opacity (0..1) and best-effort type/bounds/zoom range. This is also how you read the current stacking order.',
    inputSchema: withSession(),
    run: (hub, a) => hub.call('chart.list', {}, { session: a.session })
  },
  {
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
    run: (hub, a) =>
      hub.call(
        'chart.setVisibility',
        { ids: a.ids, visible: a.visible },
        { session: a.session }
      )
  },
  {
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
    run: (hub, a) =>
      hub.call(
        'chart.setOpacity',
        { ids: a.ids, opacity: a.opacity },
        { session: a.session }
      )
  },
  {
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
    run: (hub, a) =>
      hub.call('chart.setOrder', { order: a.order }, { session: a.session })
  }
];

module.exports = { TOOLS };
