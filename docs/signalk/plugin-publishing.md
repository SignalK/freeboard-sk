# Publishing a Signal K Plugin / Webapp

Reference for packaging a Signal K extension for npm and the App Store. General
Signal K knowledge — Freeboard-SK itself is published by its maintainers, but the
same rules apply to any plugin or webapp you build alongside it.

> **Already published Signal K packages?** Skip this file.

Authoritative upstream:
[Signal K App Store publishing docs](https://demo.signalk.org/documentation/Developing/Plugins/Publishing_to_The_AppStore.html).
See [`extension-model.md`](extension-model.md) for how the server discovers and
serves what you publish.

## `package.json` essentials

```jsonc
{
  "name": "@scope/my-plugin",
  "version": "1.0.0",
  "description": "Short description shown in App Store search",
  "keywords": [
    "signalk-node-server-plugin",   // and/or signalk-webapp, signalk-embeddable-webapp
    "signalk-category-utility"
  ],
  "files": ["dist", "public", "docs/screenshots", "CHANGELOG.md"],
  "signalk": {
    "displayName": "My Plugin",
    "appIcon": "src/assets/icons/icon-192x192.png",
    "screenshots": ["./docs/screenshots/1_main.jpg"],
    "appstore": { "categories": ["utility"], "author": "…", "description": "…" }
  }
}
```

- **`keywords`** are the capability flags the server reads on discovery (see
  [`extension-model.md`](extension-model.md)). A package may carry any combination.
- **`files`** is the tarball whitelist — prefer an explicit list over relying on
  `.npmignore`. `README.md`, `package.json`, and `LICENSE` are always included.
- **Asset base path for webapps:** the production build must set the base to
  `/<package-name>/` or assets 404 — see [`extension-model.md`](extension-model.md).

### The `appIcon` two-checks trap

The declared `appIcon` path must satisfy **two independent** `plugin-ci` checks,
and this is what bites people:

1. **Source-path check** — the file must exist in a *fresh git checkout*. A
   build-output path like `public/assets/icon.png` **fails** whenever `public/` is
   gitignored (the clone has no `public/` until something builds it).
2. **Tarball check** — the path must appear in `npm pack --dry-run`, i.e. be
   covered by `files`.

So point `appIcon` at a **committed source asset** and whitelist that exact file
in `files`. Both are warnings (not build failures), but clean them up. Verify:
`npm pack --dry-run | grep icon` **and** `git ls-files <path>`.

## CI and release workflows

**`ci.yml`** — call the shared Signal K reusable workflow (this runs the matrix
that the App Store registry credits):

```yaml
jobs:
  test:
    uses: SignalK/signalk-server/.github/workflows/plugin-ci.yml@master
    with:
      build-command: 'npm run build:all'   # override if your build differs
      test-command: 'npm run test:ci'
```

**`release_on_tag.yml`** — on a `v*` tag, create a GitHub Release with
`generate_release_notes: true` and `npm publish --provenance --access public`.
Embed `alpha`/`beta`/`rc` in the tag (e.g. `v2.0.0-beta.1`) to mark a pre-release
and publish to the matching npm dist-tag. `NPM_TOKEN` must be an Actions secret;
for repos in the `SignalK` org, the org admin manages it.

## What appears in the App Store "Changelog" tab

The Changelog tab does **not** primarily read your `CHANGELOG.md`. The server
builds it in priority order:

1. **GitHub Releases** (preferred) — the repo's release notes, rendered to Markdown.
2. **`CHANGELOG.md` from the npm tarball** — fallback for packages not on GitHub.
3. A synthesized placeholder otherwise.

Because the release workflow uses `generate_release_notes: true`, the GitHub
Release notes are GitHub's auto-generated **list of merged PR titles since the
previous tag**. So the chain is:

> **PR title → GitHub auto-generated Release notes (on `v*` tag) → App Store Changelog tab.**

Consequences:

- **A PR title is literally a line in the App Store changelog.** Write crisp,
  user-facing titles and keep the `type(scope): subject` convention — the
  Changelog tab colour-codes by prefix (`feat` / `fix` / breaking).
- **One logical change per PR** — each PR is one changelog entry; a mega-PR
  collapses a release into one vague line.
- **Still ship `CHANGELOG.md`** — but only because it's a registry *scoring* input
  (below), not what the Changelog tab displays for a GitHub-hosted package.

## Registry scoring (0–100)

The App Store scores plugins via `signalk-plugin-registry` (installs from the npm
tarball; tests from a fresh git clone):

| Check | Points |
|---|---|
| npm install succeeds | 20 |
| Plugin loads (no crash on require) | 15 |
| Plugin activates (`start()` runs) | 15 |
| Exposes a JSON schema | 5 |
| Tests pass (source clone → `npm test`) | 25 |
| No high-severity npm audit findings | 20 |
| Penalty: no CHANGELOG in tarball | −5 |
| Penalty: no screenshots | −5 |
| Penalty: no Signal K plugin-CI workflow | −10 |

Best-score-wins — a transient failure can't lower a previously passing score.

### Recurring gotchas

1. **Undeclared runtime dependency (−35).** A module `require()`d at load/activate
   that's only in `devDependencies` works locally but fails in the registry
   sandbox (`Cannot find module`). Move it to `dependencies`.
2. **`file:` devDependency breaks source tests (−25+).** The registry clones
   fresh — a `file:../sibling` path won't resolve. Publish the sibling and
   reference it by semver.
3. **CHANGELOG must be in `files`** — the registry checks the tarball, not the git
   repo.
4. **plugin-CI −10, order matters.** The penalty clears only when a CI run
   referencing the shared workflow exists on the **exact commit SHA** published to
   npm: commit+push `ci.yml` → bump version → publish.
5. **Native addons fail under noexec `/tmp`.** Any native `.node` addon loaded at
   startup fails with `ERR_DLOPEN_FAILED` in the sandbox. Lazy-load it inside the
   handler that needs it (`sharp`, `better-sqlite3`, etc.).
6. **Screenshots:** JPEG, ≤1280×800 px, ≤500 KB; list in `signalk.screenshots[]`
   **and** `files`; reference them in `README.md` via absolute GitHub raw URLs so
   they render on npmjs.com.

## Serving browser UI / iframe assets

- **Never** serve UI under `/plugins/<id>/*` via `registerWithRouter` — the server
  gates all of `/plugins` behind admin auth, breaking read-only users.
- `signalk-webapp` / `signalk-embeddable-webapp` auto-mounts `public/` at
  `/<package-name>/` and lists it in the Webapps launcher — use only for
  standalone-launchable apps.
- For assets that must be public but **not** in the launcher (e.g. an
  iframe-embedded extension UI), self-mount a static route in `start(app)`,
  namespaced by package name:

```js
app.use('/my-plugin-assets', require('express').static(path.join(__dirname, '../public')))
```

`express` is provided by the server — no extra dependency needed.
