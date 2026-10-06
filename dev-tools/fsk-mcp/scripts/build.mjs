// Bundle the browser-side background runtime into public/, which the plugin
// serves as a static route at /plotterext/fsk-mcp/. Mirrors the reference
// extensions' build (esbuild -> IIFE bundle + a generated HTML shell).
//
// NB: all progress goes to stderr. Signal K's "verify npm pack" step parses
// `npm pack --json` from stdout, and npm may run prepare scripts even with
// --ignore-scripts; keeping stdout clean avoids breaking that JSON. (fsk-mcp
// is never packed, but the habit is cheap and correct.)

import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(join(pub, 'js'), { recursive: true });

await build({
  entryPoints: [
    join(root, 'src/web/runtime.js'),
    join(root, 'src/web/window-probe.js')
  ],
  bundle: true,
  format: 'iife',
  outdir: join(pub, 'js'),
  sourcemap: true,
  target: ['es2020'],
  logLevel: 'info'
});

writeFileSync(
  join(pub, 'runtime.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>fsk-mcp runtime</title>
</head>
<body>
<!-- Headless background runtime: no UI. Bridges the fsk-mcp plugin's
     WebSocket to the host chartplotter's Plotter Extensions API. -->
<script src="js/runtime.js"></script>
</body>
</html>
`
);

writeFileSync(
  join(pub, 'window-probe.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>fsk-mcp window probe</title>
<style>
  body { margin: 0; font: 12px/1.4 system-ui, sans-serif; display: flex;
         flex-direction: column; height: 100vh; }
  header { display: flex; justify-content: space-between; align-items: start;
           gap: 8px; padding: 6px 8px; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-all; }
  body.embed pre { max-height: 4.5em; overflow: auto; }
  iframe { flex: 1 1 auto; border: 0; border-top: 1px solid #ccc; }
</style>
</head>
<body>
<!-- A window panel for agents: shows its window context, and embeds
     params.url (a page on the Signal K server) when given. -->
<header><pre id="context"></pre><button id="close">Close</button></header>
<script src="js/window-probe.js"></script>
</body>
</html>
`
);

console.error('fsk-mcp: public/ runtime and window probe built');
