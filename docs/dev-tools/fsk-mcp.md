# Driving Freeboard-SK from an agent (fsk-mcp)

`dev-tools/fsk-mcp` is a **development-only** Signal K plugin that lets an AI
coding agent control a running Freeboard-SK — set the map view, inspect and edit
routes, run resource queries, push display filters, read live Signal K values —
through [MCP](https://modelcontextprotocol.io/). It turns "put the chart at these
coordinates and this zoom, then tell me what's rendered" into a tool call instead
of a manual click-through, which is far more reliable in a verify-fix loop.

This is the **one-time setup guide**. Once you've wired it up, you don't need to
re-read this — the tools are self-describing to the agent.

## How it works

```text
agent ──MCP/HTTP──► fsk-mcp plugin ──WebSocket──► background runtime ──host bus──► Freeboard-SK
        (:3013/mcp)   (Signal K server)            (hidden iframe in the FSK tab)
```

A browser page cannot listen on a port, so the connection is established
_outward_: Freeboard loads the plugin's headless **background runtime** (a
standard Plotter Extension — see
[`freeboard-plotter-ext-support.md`](../freeboard/freeboard-plotter-ext-support.md)),
which dials the plugin's WebSocket. The plugin also serves an **MCP endpoint**
the agent connects to, and relays each tool call down the WebSocket to the
runtime, which invokes the host API and returns the result.

Nothing here is Freeboard-specific — the runtime drives whatever host answered
the Plotter Extensions handshake — but Freeboard-SK is the reference host and the
usual target.

## Prerequisites

- A **local Signal K server** you can link dev modules into and a Freeboard-SK
  dev build in front of it. If you don't have that yet, set it up first:
  [`../signalk/local-dev-environment.md`](../signalk/local-dev-environment.md).
- An MCP-capable agent (e.g. Claude Code).

## Setup

### 1. Install (builds the runtime)

```sh
cd dev-tools/fsk-mcp
npm install          # runs the build; emits public/runtime.html + bundle
```

`fsk-mcp` has its own `package.json` and is **not** part of the Freeboard build
or npm workspace, so this install is separate from the repo-root `npm i` and
never runs in Freeboard's CI.

### 2. Link the plugin into your local Signal K server

Same mechanism as any dev plugin (see the local-dev guide):

```sh
# in dev-tools/fsk-mcp
npm link

# in your signalk-server checkout
npm link fsk-mcp
```

Restart the server so it re-scans `node_modules` and discovers the plugin.

### 3. Enable it in the server admin UI

**Plugins start disabled.** Open _Server → Plugin Config → "FSK MCP Bridge
(dev)"_, enable it, and (optionally) set the port — default **3013**, bind
address **127.0.0.1**. Save. The plugin status should read something like
`MCP on http://127.0.0.1:3013/mcp, bridge on ws://127.0.0.1:3013/bridge`.

### 4. Open Freeboard-SK

Open your Freeboard-SK dev build against that server in a browser. Because the
plugin is enabled, its background runtime loads automatically and connects to the
bridge — no UI appears (it's headless). Each open Freeboard tab is one "session".

### 5. Wire the MCP endpoint into your agent

For **Claude Code**:

```sh
claude mcp add --transport http fsk http://127.0.0.1:3013/mcp
```

(or add an `fsk` entry under `mcpServers` with that URL to your project's
`.mcp.json`). Any MCP client that speaks Streamable HTTP works the same way.

Confirm the chain end-to-end by asking the agent to call **`fsk_list_sessions`**
— it should show your open Freeboard tab with the host name, version and
capabilities. If the list is empty, see _Troubleshooting_.

## Tools

| Tool                                  | Drives                                | Purpose                                                                                                                   |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `fsk_list_sessions`                   | —                                     | list connected Freeboard tabs (session id, host, version, capabilities)                                                   |
| `fsk_call`                            | any host method                       | **generic passthrough** — call any host API method by name (covers methods without a dedicated tool, and any added later) |
| `fsk_get_view`                        | `map.getView`                         | read center / zoom / bounds                                                                                               |
| `fsk_set_view`                        | `map.center`                          | center on a coordinate, optionally set zoom                                                                               |
| `fsk_fit_bounds`                      | `map.fitBounds`                       | fit the map to a bounding box                                                                                             |
| `fsk_list_resources`                  | `resources.list`                      | query a resource collection (relayed, authenticated)                                                                      |
| `fsk_set_filter` / `fsk_clear_filter` | `resources.setFilter` / `clearFilter` | display-only resource filters                                                                                             |
| `fsk_list_routes` / `fsk_get_route`   | `route.list` / `route.get`            | inspect the visible routes                                                                                                |

**Targeting a specific tab.** With more than one Freeboard tab open, pass a
`session` id (from `fsk_list_sessions`) to any tool; omit it to use the most
recently connected tab.

**Anything not listed** is reachable via `fsk_call` — e.g.
`fsk_call({ method: "route.create", params: { points: [...] } })`,
`fsk_call({ method: "signalk.put", params: { path, value } })`,
`fsk_call({ method: "units.get" })`. The full method table is in
[`../api/plotter-extensions-api.md`](../api/plotter-extensions-api.md).

## Security

- **Dev only, never on a production/boat server.** It is a remote-control channel
  whose only boundary is network reachability. It is excluded from the published
  `@signalk/freeboard-sk` package and has no App Store presence.
- **Default bind is `127.0.0.1`**, so only your machine can reach the bridge and
  MCP endpoint — correct for the usual all-on-one-laptop dev setup. On a loopback
  bind the MCP endpoint also enables DNS-rebinding protection (it rejects requests
  whose `Host` header isn't localhost), so a web page you happen to be browsing
  can't reach it.
- If you must bind to a LAN interface (`0.0.0.0`) to reach a Freeboard tab on
  another machine, set a **token** in the plugin config. It then guards **both**
  the WebSocket bridge and the MCP endpoint (which otherwise takes commands from
  anyone who can reach the port). Point your agent at it with the header:

  ```sh
  claude mcp add --transport http fsk http://<host>:3013/mcp \
    --header "Authorization: Bearer <token>"
  ```

  It's still a _light_ guard — the runtime receives the token via the public
  `bridge-config.json`, so treat it as friction against accidental/casual
  connections, not a real secret. Prefer loopback whenever you can.

## Troubleshooting

- **`fsk_list_sessions` is empty.** Freeboard isn't open, isn't pointed at the
  server running the plugin, or the plugin isn't enabled (the classic disabled
  plugin — step 3). Reload the Freeboard tab after enabling.
- **`fsk_list_sessions` stays empty and Freeboard is served over `https`.** The
  bridge is a plain (non-TLS) WebSocket, so a browser blocks the connection from
  an `https` page (mixed content) and no session ever registers. Run Freeboard
  over `http`/`localhost` for this tool. The runtime logs a warning to the browser
  console in this case.
- **Agent can't reach the MCP endpoint.** Check the plugin status line for the
  actual host/port, and that your agent URL matches it. A `127.0.0.1` bind is not
  reachable from another machine.
- **Port already in use.** Change the port in the plugin config (keep it off
  3000, the Signal K server's own port).
- **Commands time out.** The Freeboard tab may have been closed (its session went
  away) or the host doesn't implement that capability — a capability error comes
  back as a tool error naming the reason.
