// The plotterExtensions manifest this plugin advertises. Kept separate so its
// shape can be unit-tested without starting the bridge/MCP servers.
//
// It declares one headless background runtime and requires only
// `background.iframe`; every host capability the runtime might drive is
// `optional`, so the bridge mounts on any conforming host and simply reports a
// capability error if the agent calls a method the host doesn't implement.

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
      'ui'
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
