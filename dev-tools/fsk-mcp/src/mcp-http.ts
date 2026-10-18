// MCP server over Streamable HTTP.
//
// The agent connects here as a remote MCP server (POST/GET/DELETE on /mcp).
// Tool calls are dispatched to the declarative TOOLS table and relayed to the
// browser runtime through the bridge hub. The MCP SDK is imported when the
// handler is first built, so a plugin that is never enabled never loads it.

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StreamableHTTPServerTransport as Transport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { BridgeHub } from './bridge-hub.ts';
import { messageOf, reasonOf } from './errors.ts';
import { TOOLS } from './tools.ts';

const MAX_BODY_BYTES = 4 * 1024 * 1024;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length; // byte length — the cap is a byte limit
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      const text = Buffer.concat(chunks).toString('utf8'); // decode once, whole
      try {
        resolve(text ? JSON.parse(text) : undefined);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  message: unknown,
  id: unknown = null
): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id })
  );
}

export interface McpHttpOptions {
  hub: BridgeHub;
  logger?: (msg: string) => void;
  version?: string;
  token?: string | null;
  host: string;
  port: number;
}

export interface McpHttpHandler {
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
  close(): void;
}

// The JSON-RPC id of a request body, for an error reply to echo.
function requestId(body: unknown): unknown {
  return (
    (typeof body === 'object' && body !== null && 'id' in body
      ? body.id
      : undefined) ?? null
  );
}

// Build an MCP handler bound to a bridge hub. Returns { handle(req,res), close() }.
// When `token` is set, every MCP request must present `Authorization: Bearer <token>`
// — so the token guards the MCP endpoint as well as the WebSocket bridge, which
// matters if the server is bound to a non-loopback interface.
//
// On a loopback bind we also turn on the SDK's DNS-rebinding protection with a
// localhost Host allow-list: that is the interface a malicious web page could try
// to reach via DNS rebinding, and the guard rejects any request whose Host header
// isn't one of ours. A non-loopback (LAN) bind can't enumerate its valid hosts,
// so it relies on the token instead.
export async function createMcpHttpHandler({
  hub,
  logger,
  version,
  token,
  host,
  port
}: McpHttpOptions): Promise<McpHttpHandler> {
  const log = logger || (() => {});
  const isLoopback =
    host === '127.0.0.1' || host === 'localhost' || host === '::1';
  const dnsGuard = isLoopback
    ? {
        enableDnsRebindingProtection: true,
        allowedHosts: [
          `127.0.0.1:${port}`,
          `localhost:${port}`,
          `[::1]:${port}`
        ]
      }
    : {};
  const authorized = (req: IncomingMessage) =>
    !token || req.headers['authorization'] === `Bearer ${token}`;
  const [{ Server }, { StreamableHTTPServerTransport }, types] =
    await Promise.all([
      import('@modelcontextprotocol/sdk/server/index.js'),
      import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
      import('@modelcontextprotocol/sdk/types.js')
    ]);
  const { ListToolsRequestSchema, CallToolRequestSchema, isInitializeRequest } =
    types;

  const makeServer = () => {
    const server = new Server(
      { name: 'fsk-mcp', version: version || '0.0.0' },
      {
        capabilities: { tools: {} },
        instructions:
          'Drive a running Freeboard-SK chart plotter for debugging: set the map view, ' +
          'inspect and edit routes, query resources and push display filters. ' +
          'Start with fsk_list_sessions; use fsk_call for any host API method without a dedicated tool.'
      }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    }));

    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const tool = TOOLS.find((t) => t.name === req.params.name);
      if (!tool) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${req.params.name}` }]
        };
      }
      try {
        const result = await tool.run(hub, req.params.arguments || {});
        return {
          content: [
            { type: 'text', text: JSON.stringify(result ?? null, null, 2) }
          ]
        };
      } catch (err) {
        const reason = reasonOf(err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${messageOf(err) ?? err}${reason ? ` (reason: ${reason})` : ''}`
            }
          ]
        };
      }
    });

    return server;
  };

  const transports = new Map<string, Transport>(); // sessionId -> transport

  async function handle(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      if (!authorized(req)) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'unauthorized' },
            id: null
          })
        );
        return;
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const sid = req.headers['mcp-session-id'];
        let transport =
          typeof sid === 'string' ? transports.get(sid) : undefined;

        if (!transport) {
          if (!isInitializeRequest(body)) {
            return sendJsonRpcError(
              res,
              400,
              'No valid session — send an initialize request first',
              requestId(body)
            );
          }
          const created: Transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (id) => {
              transports.set(id, created);
            },
            ...dnsGuard
          });
          created.onclose = () => {
            if (created.sessionId) transports.delete(created.sessionId);
          };
          await makeServer().connect(created);
          transport = created;
        }
        await transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        const sid = req.headers['mcp-session-id'];
        const transport =
          typeof sid === 'string' ? transports.get(sid) : undefined;
        if (!transport)
          return sendJsonRpcError(res, 400, 'Unknown or missing session');
        await transport.handleRequest(req, res);
        return;
      }

      res.writeHead(405, { allow: 'POST, GET, DELETE' }).end();
    } catch (err) {
      log(`mcp: request error: ${messageOf(err) ?? err}`);
      if (!res.headersSent)
        sendJsonRpcError(res, 400, messageOf(err) ?? 'bad request');
    }
  }

  function close(): void {
    for (const transport of transports.values()) {
      try {
        transport.close();
      } catch {
        /* ignore */
      }
    }
    transports.clear();
  }

  return { handle, close };
}
