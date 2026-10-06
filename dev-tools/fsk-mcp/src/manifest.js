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

const pkg = require('../package.json');

const PLUGIN_ID = 'fsk-mcp';
const ASSET_BASE = `/plotterext/${PLUGIN_ID}`;

function buildManifest() {
  return {
    name: 'FSK MCP Bridge (dev)',
    description:
      'Development bridge: lets an MCP client (AI agent) drive this chart plotter via a headless background runtime.',
    version: pkg.version,
    apiVersion: '1',
    requires: ['background.iframe'],
    optional: [
      'map',
      'routes',
      'resources',
      'resources.filter',
      'signalk.stream',
      'signalk.put',
      'units',
      'ui',
      'windows'
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
