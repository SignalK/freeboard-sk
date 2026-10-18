# fsk-mcp — agent bridge for Freeboard-SK (dev only)

A small Signal K server plugin that lets an AI coding agent **drive a running
Freeboard-SK** during development — set the map view, inspect and edit routes,
query resources and push display filters — by exposing the Plotter Extensions
host API as [MCP](https://modelcontextprotocol.io/) tools.

```text
agent ──MCP/HTTP──► fsk-mcp plugin ──WebSocket──► background runtime ──host bus──► Freeboard-SK
        (:3013/mcp)   (Signal K server)            (hidden iframe in the FSK tab)
```

A browser page can't listen on a port, but it can dial out: the plugin's
WebSocket server is what the Freeboard-loaded background runtime connects back
to, so commands flow agent → plugin → runtime → host API and results return the
same way.

It is **not host-specific** — it drives whatever Plotter Extensions host is
running — but it lives here because Freeboard-SK is the reference host and the
primary thing you'll debug with it.

> **Dev tool only.** This is a remote-control channel with no real auth beyond
> "on your machine." It is excluded from the published `@signalk/freeboard-sk`
> package (the `files` whitelist ships only build outputs) and must never be
> enabled on a production/boat server. Bind it to `127.0.0.1` (the default).

## Quick start

```sh
cd dev-tools/fsk-mcp && npm install          # builds plugin/ and the runtime into public/
# then npm link it into your local Signal K server and enable it
```

Full setup — linking into a local server, enabling the plugin, and wiring the
MCP endpoint into your agent — is in
[`docs/dev-tools/fsk-mcp.md`](../../docs/dev-tools/fsk-mcp.md).

## Layout

| Path                 | What                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `src/index.ts`       | plugin entry: resource provider, asset serving, HTTP server (WS bridge + MCP) |
| `src/manifest.ts`    | the `plotterExtensions` manifest (one background runtime)                     |
| `src/bridge-hub.ts`  | WebSocket hub: session registry + call relay                                  |
| `src/mcp-http.ts`    | MCP server over Streamable HTTP                                               |
| `src/tools.ts`       | the MCP tool surface — **keep in sync with the host API**                     |
| `src/web/runtime.ts` | the browser-side bridge (bundled into `public/`)                              |
| `plugin/index.js`    | build output: the bundled plugin entry that `main` names (gitignored)         |

The sources are strict TypeScript (Node 22.18+ to build and test). `npm run
build` type-checks them (`npm run typecheck`) and bundles them with esbuild:
`src/index.ts` into `plugin/index.js`, which the Signal K server loads, and
`src/web/` into `public/`. `npm test` runs the `node --test` suites against the
TypeScript sources, plus one check that the built `plugin/index.js` loads and
starts.
