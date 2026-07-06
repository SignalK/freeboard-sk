#!/usr/bin/env node
/**
 * Freeboard-SK perf harness — static app server with SignalK proxy.
 *
 * Serves a built app dir AND reverse-proxies the SignalK HTTP API + WS stream on
 * the SAME origin, so the app's withCredentials requests don't hit the
 * CORS-with-credentials wall you get serving it cross-origin. Used by the
 * profiler and the draw/modify smoke test, and handy for poking at a built app
 * by hand against the dockerised SignalK server.
 *
 * Env:
 *   BUILD_DIR  dir to serve         (default ../../public)
 *   PORT       static server port   (default 8087)
 *   SKHOST/SKPORT  SignalK host/port (default localhost / 3010)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import httpProxy from 'http-proxy';

const __dir = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.wasm': 'application/wasm', '.txt': 'text/plain',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json'
};

// Serve `dir` and reverse-proxy the SignalK API + WS stream at `skTarget` on the
// same origin. Returns { server, getWsUpgrades }.
export function startServer(dir, port, skTarget) {
  const proxy = httpProxy.createProxyServer({ target: skTarget, ws: true, changeOrigin: true });
  proxy.on('error', (err, req, res) => {
    try { if (res && res.writeHead) { res.writeHead(502); res.end('proxy error'); } } catch {}
  });
  let wsUpgrades = 0;
  const isApi = (u) =>
    u.startsWith('/signalk') || u.startsWith('/skServer') || u.startsWith('/plugins') ||
    u.startsWith('/admin') || u.startsWith('/apps') || u.startsWith('/restart') || u === '/loginStatus';
  const server = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (isApi(u)) return proxy.web(req, res);
    try {
      const p = decodeURIComponent(u);
      let fp = path.join(dir, p === '/' ? '/index.html' : p);
      if (!fp.startsWith(dir)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        if (!path.extname(fp)) fp = path.join(dir, 'index.html');
      }
      if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('not found'); }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  server.on('upgrade', (req, socket, head) => { wsUpgrades++; proxy.ws(req, socket, head); });
  return new Promise((resolve) =>
    server.listen(port, () => resolve({ server, getWsUpgrades: () => wsUpgrades }))
  );
}

// Run standalone: serve until Ctrl-C.
if (import.meta.url === `file://${process.argv[1]}`) {
  const BUILD_DIR = path.resolve(__dir, process.env.BUILD_DIR || '../../public');
  const PORT = Number(process.env.PORT || 8087);
  const SKHOST = process.env.SKHOST || 'localhost';
  const SKPORT = process.env.SKPORT || '3010';
  await startServer(BUILD_DIR, PORT, `http://${SKHOST}:${SKPORT}`);
  console.error(`[serve] ${BUILD_DIR} on http://localhost:${PORT}  (SignalK proxy -> ${SKHOST}:${SKPORT})`);
  console.error('[serve] Ctrl-C to stop.');
}
