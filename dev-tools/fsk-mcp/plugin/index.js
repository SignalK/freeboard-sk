// fsk-mcp — a dev-only Signal K plugin that lets an AI agent drive a running
// Freeboard-SK (or any Plotter Extensions host) during development.
//
// Chain:  agent  --MCP/HTTP-->  this plugin  --WebSocket-->  background runtime
//         (iframe in the Freeboard tab)  --host bus-->  the chart plotter.
//
// The plugin does four things on start():
//   1. Registers the `plotterExtensions` manifest declaring one headless
//      background runtime (served from public/runtime.html).
//   2. Serves that runtime's assets at /plotterext/fsk-mcp/ (public, non-admin,
//      same mechanism the reference extensions use).
//   3. Serves bridge-config.json so the runtime learns the WS port (+ token).
//   4. Starts a standalone HTTP server on a configurable port hosting the
//      WebSocket bridge (/bridge) and the MCP endpoint (/mcp).
//
// It is NEVER shipped in @signalk/freeboard-sk (the package `files` whitelist
// excludes dev-tools/). Install it into a local server only for development —
// see docs/dev-tools/fsk-mcp.md.

const path = require('path');
const http = require('http');

const { BridgeHub } = require('../src/bridge-hub');
const { createMcpHttpHandler } = require('../src/mcp-http');
const { PLUGIN_ID, ASSET_BASE, buildManifest } = require('../src/manifest');

const pkg = require('../package.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const DEFAULT_PORT = 3013;
const DEFAULT_HOST = '127.0.0.1';
const BRIDGE_PATH = '/bridge';
const MCP_PATH = '/mcp';

module.exports = (app) => {
  let running = false;
  let providerRegistered = false;
  let assetsMounted = false;

  // Bumped on every start()/stop(). Async server bring-up captures the value at
  // entry and bails if it changes underneath it — so a rapid stop→start (e.g. a
  // config save restarts the plugin) can't leave a stale server bound.
  let generation = 0;

  let hub = null;
  let mcp = null;
  let httpServer = null;
  let serverClosing = null; // resolves when a torn-down server has released its port
  let config = { port: DEFAULT_PORT, host: DEFAULT_HOST, token: '' };

  const debug = (msg) => app.debug(`${PLUGIN_ID}: ${msg}`);

  // Returns true when the runtime assets are (or will be) reachable: either
  // mounted here, or there is no Express app to mount on (a minimal/test host,
  // where the browser runtime isn't exercised). Returns false only when mounting
  // was expected but failed — the caller must then not advertise the extension.
  const mountAssets = () => {
    if (assetsMounted) return true;
    if (typeof app.use !== 'function' || typeof app.get !== 'function') {
      return true;
    }
    try {
      const serveStatic = require('express').static;
      // bridge-config.json is dynamic (carries the runtime-configured
      // port/token), so register it before the static mount.
      app.get(`${ASSET_BASE}/bridge-config.json`, (_req, res) => {
        res.json({
          port: config.port,
          path: BRIDGE_PATH,
          token: config.token || undefined
        });
      });
      app.use(ASSET_BASE, serveStatic(PUBLIC_DIR));
      assetsMounted = true;
      debug(`assets served at ${ASSET_BASE}`);
      return true;
    } catch (err) {
      app.error(
        `${PLUGIN_ID}: cannot serve ${ASSET_BASE}: ${err?.message ?? err}`
      );
      return false;
    }
  };

  const registerProvider = () => {
    if (providerRegistered) return;
    if (typeof app.registerResourceProvider !== 'function') {
      app.error(`${PLUGIN_ID}: server has no resource provider registry`);
      return;
    }
    app.registerResourceProvider({
      type: 'plotterExtensions',
      methods: {
        listResources: async () =>
          running ? { [PLUGIN_ID]: buildManifest() } : {},
        getResource: async (id) => {
          if (!running || id !== PLUGIN_ID) {
            throw new Error(`No such plotterExtensions resource: ${id}`);
          }
          return buildManifest();
        },
        setResource: async () => {
          throw new Error(`${PLUGIN_ID} is a read-only provider`);
        },
        deleteResource: async () => {
          throw new Error(`${PLUGIN_ID} is a read-only provider`);
        }
      }
    });
    providerRegistered = true;
  };

  // Bring the servers up entirely in local variables and only publish them to
  // the shared hub/mcp/httpServer at the very end, once this generation still
  // owns the plugin. That way an overlapping start/stop can never make one
  // generation tear down another generation's live server.
  const startServers = async () => {
    const myGeneration = generation;
    const superseded = () => !running || myGeneration !== generation;

    const localHub = new BridgeHub({
      logger: debug,
      token: config.token || null
    });
    const localMcp = await createMcpHttpHandler({
      hub: localHub,
      logger: debug,
      version: pkg.version,
      token: config.token || null,
      host: config.host,
      port: config.port
    });
    // Close only what this generation built — never the shared references.
    const abandonLocals = (server) => {
      localMcp.close();
      localHub.close();
      if (server) {
        try {
          server.close();
        } catch {
          /* not listening */
        }
      }
    };

    if (superseded()) {
      // stop()/restart happened while the ESM MCP SDK was importing.
      abandonLocals();
      return;
    }

    const localServer = http.createServer((req, res) => {
      const url = req.url || '/';
      if (
        url === MCP_PATH ||
        url.startsWith(`${MCP_PATH}?`) ||
        url.startsWith(`${MCP_PATH}/`)
      ) {
        localMcp.handle(req, res);
      } else {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('fsk-mcp: not found\n');
      }
    });
    localHub.attach(localServer, BRIDGE_PATH); // handles WS upgrades on BRIDGE_PATH

    // Wait for a previous instance's server to finish releasing the port before
    // binding — a quick stop→start (e.g. a config save) otherwise races EADDRINUSE.
    if (serverClosing) {
      await serverClosing;
      if (superseded()) {
        abandonLocals(localServer);
        return;
      }
    }

    try {
      await new Promise((resolve, reject) => {
        localServer.once('error', reject);
        localServer.listen(config.port, config.host, () => {
          localServer.off('error', reject);
          resolve();
        });
      });
    } catch (err) {
      abandonLocals(localServer); // e.g. EADDRINUSE — clean up this generation
      throw err; // surfaced by start()'s (generation-guarded) catch
    }

    // Keep a permanent handler: a later async server error (EMFILE, socket
    // failures) with no listener is an uncaught exception that would take the
    // whole Signal K process down.
    localServer.on('error', (err) => {
      app.error(
        `${PLUGIN_ID}: bridge/MCP server error: ${err?.message ?? err}`
      );
    });

    if (superseded()) {
      abandonLocals(localServer); // stopped/restarted while binding
      return;
    }

    // We still own the plugin: publish and go live.
    hub = localHub;
    mcp = localMcp;
    httpServer = localServer;
    const wildcard = config.host === '0.0.0.0' || config.host === '::';
    app.setPluginStatus(
      wildcard
        ? `MCP + bridge listening on port ${config.port} (bound to ${config.host} — connect via this host's address)`
        : `MCP on http://${config.host}:${config.port}${MCP_PATH}, bridge on ws://${config.host}:${config.port}${BRIDGE_PATH}`
    );
    debug(
      `listening on ${config.host}:${config.port} (mcp ${MCP_PATH}, bridge ${BRIDGE_PATH})`
    );
  };

  const teardown = () => {
    if (mcp) mcp.close();
    if (hub) hub.close();
    if (httpServer) {
      const closing = httpServer;
      serverClosing = new Promise((resolve) => {
        try {
          closing.close(() => resolve());
        } catch {
          resolve();
        }
      });
    }
    mcp = null;
    hub = null;
    httpServer = null;
  };

  return {
    id: PLUGIN_ID,
    name: 'FSK MCP Bridge (dev)',
    description:
      'Dev-only: exposes an MCP server that drives a running Freeboard-SK for agent-assisted debugging. Not for production installs.',
    schema: () => ({
      type: 'object',
      properties: {
        port: {
          type: 'integer',
          minimum: 1,
          maximum: 65535,
          title: 'Bridge / MCP port',
          description:
            'Port for the WebSocket bridge and MCP endpoint (kept off 3000).',
          default: DEFAULT_PORT
        },
        host: {
          type: 'string',
          title: 'Bind address',
          description:
            'Interface to bind. 127.0.0.1 (default) keeps it local to this machine; use 0.0.0.0 only on a trusted dev LAN, and set a token.',
          default: DEFAULT_HOST
        },
        token: {
          type: 'string',
          title: 'Shared token (optional)',
          description:
            'If set, guards both the WebSocket bridge and the MCP endpoint (agents send it as "Authorization: Bearer <token>"). A light guard for non-loopback binds — it is delivered to the runtime via the public bridge-config.json, so it is not a strong secret; prefer binding to 127.0.0.1.',
          default: ''
        }
      }
    }),

    start(options) {
      running = true;
      generation += 1;
      const myGeneration = generation;
      config = {
        port: Number(options?.port) || DEFAULT_PORT,
        host: options?.host || DEFAULT_HOST,
        token: options?.token || ''
      };
      if (!mountAssets()) {
        // Assets couldn't be served, so a runtime Freeboard loaded could never
        // fetch its page. Don't advertise the extension at all.
        running = false;
        app.setPluginError(
          `cannot serve extension assets — ${PLUGIN_ID} disabled`
        );
        return;
      }
      registerProvider();
      // Server bring-up is async (ESM MCP SDK import + listen); don't block the
      // server's start(). Surface failures as plugin status rather than crashing.
      startServers().catch((err) => {
        // startServers cleaned up its own local instances; just report — and
        // only if this is still the active generation.
        if (myGeneration !== generation) return;
        // Stop advertising the extension: with no bridge behind it, a runtime
        // Freeboard loaded would only fail to connect. listResources() gates on
        // `running`, so this removes fsk-mcp from the plotterExtensions set.
        running = false;
        app.error(
          `${PLUGIN_ID}: failed to start bridge/MCP server: ${err?.message ?? err}`
        );
        app.setPluginError(`bridge/MCP server failed: ${err?.message ?? err}`);
      });
      debug('started');
    },

    stop() {
      running = false;
      generation += 1;
      teardown();
      debug('stopped');
    }
  };
};
