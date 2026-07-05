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
  entryPoints: [join(root, 'src/web/runtime.js')],
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

console.error('fsk-mcp: public/ runtime built');
