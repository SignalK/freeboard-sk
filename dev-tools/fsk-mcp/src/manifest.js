// The plotterExtensions manifest this plugin advertises. Kept separate so its
// shape can be unit-tested without starting the bridge/MCP servers.
//
// It declares one headless background runtime and requires only
// `background.iframe`; every host capability the runtime might drive is
// `optional`, so the bridge mounts on any conforming host and simply reports a
// capability error if the agent calls a method the host doesn't implement. Its
// one panel, the window probe, is never shown by the host on its own: it is
// what the agent opens in a window (capability `windows`), since an extension
// can only show its own panels in windows.
//
// Its one data overlay, the scratch layer, likewise exists for the agent: the
// overlay methods only reach the caller's own overlays, so the bridge needs one
// of its own to exercise `overlays.data`, and it doubles as a way to draw any
// GeoJSON on the chart while debugging (fsk_set_overlay_data).

const pkg = require('../package.json');

const PLUGIN_ID = 'fsk-mcp';
const ASSET_BASE = `/plotterext/${PLUGIN_ID}`;

// Features take `color` and `label` properties; `global-state` `color` is the
// colour of features without one (set it with fsk_set_overlay_state).
const FEATURE_COLOR = ['coalesce', ['get', 'color'], ['global-state', 'color']];

const SCRATCH_STYLE = {
  version: 8,
  state: { color: { default: '#e040fb' } },
  sources: {
    scratch: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    }
  },
  layers: [
    {
      id: 'areas',
      type: 'fill',
      source: 'scratch',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': FEATURE_COLOR, 'fill-opacity': 0.25 }
    },
    {
      id: 'lines',
      type: 'line',
      source: 'scratch',
      filter: ['!=', ['geometry-type'], 'Point'],
      paint: { 'line-color': FEATURE_COLOR, 'line-width': 2 }
    },
    {
      id: 'points',
      type: 'circle',
      source: 'scratch',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': FEATURE_COLOR,
        'circle-radius': 5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'scratch',
      layout: {
        'text-field': ['coalesce', ['get', 'label'], ''],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top'
      },
      paint: { 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
    }
  ]
};

function buildManifest() {
  return {
    name: 'FSK MCP Bridge (dev)',
    description:
      'Development bridge: lets an MCP client (AI agent) drive this chart plotter via a headless background runtime.',
    version: pkg.version,
    apiVersion: '1',
    requires: ['background.iframe'],
    optional: [
      'events.publish',
      'map',
      'routes',
      'resources',
      'resources.filter',
      'signalk.stream',
      'signalk.put',
      'units',
      'ui',
      'windows',
      'overlays.data'
    ],
    panels: [
      {
        id: 'window-probe',
        title: 'FSK MCP window probe',
        type: 'iframe',
        url: `${ASSET_BASE}/window-probe.html`,
        lifecycle: 'onOpen'
      }
    ],
    overlays: [
      {
        id: 'scratch',
        title: 'FSK MCP scratch layer (dev)',
        type: 'data',
        band: 'aboveResources',
        style: SCRATCH_STYLE
      }
    ],
    background: [
      {
        id: 'bridge',
        title: 'FSK MCP Bridge',
        type: 'iframe',
        url: `${ASSET_BASE}/runtime.html`
      }
    ]
  };
}

module.exports = { PLUGIN_ID, ASSET_BASE, buildManifest };
