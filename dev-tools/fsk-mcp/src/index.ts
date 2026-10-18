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

import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin, ServerAPI } from '@signalk/server-api';
import type { Application } from 'express';
import pkg from '../package.json' with { type: 'json' };
import { BridgeHub } from './bridge-hub.ts';
import { messageOf } from './errors.ts';
import { createMcpHttpHandler, type McpHttpHandler } from './mcp-http.ts';
import { PLUGIN_ID, ASSET_BASE, buildManifest } from './manifest.ts';

// Both this source and its bundle (plugin/index.js) sit one level below the
// package root, where public/ is built.
const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

// An ES module has no `require`. Express is still loaded on demand, only when
// there is an Express app to mount on, so a failure to load it is reported.
const nodeRequire = createRequire(import.meta.url);

const DEFAULT_PORT = 3013;
const DEFAULT_HOST = '127.0.0.1';
const BRIDGE_PATH = '/bridge';
const MCP_PATH = '/mcp';

// What the plugin uses of the server's app. A minimal host (the tests) has no
// Express routing to mount the runtime's assets on.
export type PluginApp = Pick<
  ServerAPI,
  'debug' | 'error' | 'setPluginStatus' | 'setPluginError'
> &
  Partial<Pick<ServerAPI, 'registerResourceProvider'>> &
  Partial<Pick<Application, 'use' | 'get'>>;

// The plugin's stored configuration (see schema()), as the server hands it over.
export interface FskMcpOptions {
  port?: number | string;
  host?: string;
  token?: string;
}

export default function fskMcp(app: PluginApp): Plugin {
  let running = false;
  let providerRegistered = false;
  let assetsMounted = false;

  // Bumped on every start()/stop(). Async server bring-up captures the value at
  // entry and bails if it changes underneath it — so a rapid stop→start (e.g. a
  // config save restarts the plugin) can't leave a stale server bound.
  let generation = 0;

  let hub: BridgeHub | null = null;
  let mcp: McpHttpHandler | null = null;
  let httpServer: http.Server | null = null;
  let serverClosing: Promise<void> | null = null; // resolves when a torn-down server has released its port
  let config = { port: DEFAULT_PORT, host: DEFAULT_HOST, token: '' };

  const debug = (msg: string) => app.debug(`${PLUGIN_ID}: ${msg}`);

  // Returns true when the runtime assets are (or will be) reachable: either
  // mounted here, or there is no Express app to mount on (a minimal/test host,
  // where the browser runtime isn't exercised). Returns false only when mounting
  // was expected but failed — the caller must then not advertise the extension.
  const mountAssets = (): boolean => {
    if (assetsMounted) return true;
    if (typeof app.use !== 'function' || typeof app.get !== 'function') {
      return true;
    }
    try {
      const { static: serveStatic } = nodeRequire(
        'express'
      ) as typeof import('express');
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
        `${PLUGIN_ID}: cannot serve ${ASSET_BASE}: ${messageOf(err) ?? err}`
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
        getResource: async (id: string) => {
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
  const startServers = async (): Promise<void> => {
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
    const abandonLocals = (server?: http.Server) => {
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
      await new Promise<void>((resolve, reject) => {
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
        `${PLUGIN_ID}: bridge/MCP server error: ${messageOf(err) ?? err}`
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
      serverClosing = new Promise<void>((resolve) => {
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

    start(options: FskMcpOptions) {
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
      startServers().catch((err: unknown) => {
        // startServers cleaned up its own local instances; just report — and
        // only if this is still the active generation.
        if (myGeneration !== generation) return;
        // Stop advertising the extension: with no bridge behind it, a runtime
        // Freeboard loaded would only fail to connect. listResources() gates on
        // `running`, so this removes fsk-mcp from the plotterExtensions set.
        running = false;
        app.error(
          `${PLUGIN_ID}: failed to start bridge/MCP server: ${messageOf(err) ?? err}`
        );
        app.setPluginError(
          `bridge/MCP server failed: ${messageOf(err) ?? err}`
        );
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
}
