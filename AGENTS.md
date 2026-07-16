# Freeboard-SK

Freeboard-SK (`@signalk/freeboard-sk`) is the primary chart-plotter web app for the
[Signal K](https://signalk.org/) ecosystem. It is an **Angular** application served
by a Signal K server as a `signalk-webapp`, and it ships a small companion
`signalk-node-server-plugin` (the "helper") in the same package.

These guidelines are written for AI coding assistants, but they apply equally to
human contributors. Where something is "overly specific," it's an explicit guardrail
for AI tools — humans should use judgment and follow the spirit.

This project is an **upstream Signal K project** (`SignalK/freeboard-sk`). It has a
large, often non-technical user base, so changes warrant extra care.

## Repository layout

| Path | What |
|------|------|
| `src/app/` | the Angular webapp; feature areas under `src/app/modules/` (`map`, `skresources`, `plotterext`, `autopilot`, `radar`, `weather`, `gpx`, `settings`, …) |
| `helper/` | the companion server plugin (TypeScript) |
| `scripts/` | build/test wrappers (`build-web.mjs`, `test-ci.mjs`) — see *Build/test* |
| `dev-tools/` | developer-only tooling, **never shipped** (excluded by the package `files` whitelist, and not an npm workspace). e.g. `fsk-mcp/` — an MCP bridge that lets an agent drive a running Freeboard (see *Build, test, run*) |
| `docs/` | the documentation set this file indexes |
| `public/` | build output: the webapp (served by the SK server at `/@signalk/freeboard-sk/`) — gitignored |
| `plugin/` | build output: the compiled helper plugin — gitignored |
| `.github/workflows/ci.yml` | CI: calls the shared Signal K `plugin-ci` workflow |

## Build, test, run

Node `>=18`. Install with `npm i`. Angular `21`.

| Command | Use |
|---------|-----|
| `npm start` / `ng serve` | dev server at `http://localhost:4200` with live reload |
| `npm run build:web` | build the **webapp** → `public/` (use this, not raw `ng build` — see below) |
| `npm run build:helper` | build the **helper plugin** → `plugin/` |
| `npm run build:all` / `build:prod` | both (what CI builds, what `npm pack` runs) |
| `npm run test:ci` | run unit tests once and **exit** (what CI runs — see below) |
| `npm test` | `ng test` in watch mode (local dev only — does not exit) |
| `npm run format` | Prettier over `src/` (and `format:all` for `helper/` too) |

> **Why `build:web` / `test:ci` exist (important).** Angular's esbuild-based
> `ng build` / `ng test` complete successfully but then **fail to terminate** — a
> lingering esbuild service keeps the event loop alive. In CI that hangs the job to
> its timeout *even though everything passed*. The `scripts/build-web.mjs` and
> `scripts/test-ci.mjs` wrappers run the Angular command, detect the
> success/summary, and force-exit. **Always use `npm run build:web` and
> `npm run test:ci` for anything that must terminate** (CI, scripts, an agent
> verifying a change). Plain `npm test` stays as the local watch command.

**Pointing the dev server at a server:** in dev mode the app connects to the
Signal K server in the browser URL. To target a specific server while running
`ng serve`, edit the `DEV_SERVER` object (`host`/`port`/`ssl`) in
`src/app/app.facade.ts`. This applies in **development mode only**. See
[`docs/signalk/local-dev-environment.md`](docs/signalk/local-dev-environment.md)
for running a local Signal K server to develop against.

### Driving Freeboard from an agent — `dev-tools/fsk-mcp`

To have your agent control a running Freeboard directly while debugging — set the
map view, inspect and edit routes, push resource filters, read live data — install
the bundled MCP bridge in [`dev-tools/fsk-mcp/`](dev-tools/fsk-mcp/). It exposes the
Plotter Extensions host API as MCP tools, so "put the chart here at this zoom, then
tell me what's rendered" becomes a tool call instead of a manual click-through. The
one-time wiring (link the plugin, enable it, point your agent at the MCP endpoint)
is in [`docs/dev-tools/fsk-mcp.md`](docs/dev-tools/fsk-mcp.md); it's dev-only and
never shipped.

**Keep it in sync with the host API.** When you add or change a Plotter Extensions
host API method (the `map.*` / `route.*` / `resources.*` / … surface in
[`docs/api/plotter-extensions-api.md`](docs/api/plotter-extensions-api.md)), add or
update the matching tool in `dev-tools/fsk-mcp/src/tools.js` so agents can exercise
the new behaviour. (`fsk_call` already reaches any method generically; the curated
tools exist for clean, discoverable schemas — that file is the single place they
live.)

## Code quality

- **Scope discipline.** Make only the change requested or clearly necessary. A bug
  fix doesn't need surrounding code cleaned up; a small feature doesn't need extra
  configurability. Don't add error handling for cases that can't happen — validate
  at boundaries (user input, server responses), trust internal code.
- **Self-documenting code.** Comments explain *why*, not *what*. No echo comments.
  Documentation describes current state, not development history.
- **TypeScript.** New code is TypeScript with real types; avoid `any`. Reuse
  existing types over inventing local ones.
- **Angular conventions.** Standalone components and **signals** are the norm here.
  Prefer signals/`computed`/`effect` over manual change detection. Keep components
  focused; push logic into services.
- **Logging.** Use `console.warn` (not `console.error`) for *recoverable*
  feature-detection failures, and `this.app.debug()` for internal state tracing —
  not `console.log`.
- **Displaying values → `formatValueForDisplay()`.** Render every user-facing numeric
  value through `app.formatValueForDisplay(value, sourceUnit, { path })`. It applies the
  user's unit preferences — a per-path server override (`meta.displayUnits`) when a
  `path` is given, otherwise the category preset — and returns the value with its
  symbol. Pass `path` whenever the value maps to a Signal K path; derived/computed
  values omit it. Don't call `Convert` directly for display — `Convert` is the pure
  primitive for geometry and numeric math only. See
  [`docs/signalk/unit-preferences.md`](docs/signalk/unit-preferences.md).
- **Tests.** New behaviour needs tests where the test infrastructure supports it
  (`*.spec.ts`, run via `npm run test:ci`). Test behaviour, not implementation.

## Contributing — PR standards

History note: many older PRs lack descriptions, tests, or a clean title. Don't
continue that. The bar below is what "done correctly" means here.

- **One logical change per PR.** Refactors and behaviour changes go in separate
  PRs. If the change would be two lines in a changelog, it's two PRs — split them
  *before* opening, even if you did them together. **Proactively enforce this:** if
  asked for something unrelated to the current PR, suggest a separate PR rather than
  silently bundling it.
- **PR titles are release notes.** Freeboard's App Store "Changelog" is generated
  from PR titles (see *Hard-won knowledge*). Use `type(scope): short imperative
  subject` (lowercase, no period); types `feat|fix|perf|refactor|docs|test|chore`;
  scope = the area (`map`, `routes`, `charts`, `plotterext`, `deps`, …). Ask: "if
  someone read only the title, would they understand what this does?"
- **PR descriptions: succinct, why + how, not what.** The diff shows *what*. Don't
  pad with mechanics, changed-line lists, version numbers, or self-congratulation —
  maintainers should not have to wade through AI fluff. Call out breaking changes.
  If you include a test-plan checklist, **every box must be checked** before review.
  Include before/after screenshots for visible UI changes.
- **Tests + CI must pass.** Add/extend `*.spec.ts` for new behaviour. CI runs the
  shared Signal K `plugin-ci` workflow (`build:all` + `test:ci`) across a
  Linux/macOS/Windows + arm matrix; it must be green.
- **Never change version numbers.** Maintainers own versioning and publish releases.
- **Branch from latest `master`; rebase, never merge.** Clean up commit history
  before opening (no "fix typo"/"oops" commits — amend into the relevant commit).
  When updating with upstream: `git fetch && git rebase origin/master`, force-push.
- **CodeRabbit** reviews PRs automatically — address its comments, then it's ready
  for maintainer review.
- **Share what you learned — keep the lessons log alive.** If working on your PR
  surfaced something non-obvious about developing FSK locally (a toolchain trap, a
  test-setup gotcha, a platform or hardware quirk), add it to
  [`docs/freeboard/DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md)
  so the next contributor doesn't rediscover it. The bar is *non-obvious and
  reusable*, **not** *universal*: lessons that apply to a whole class of setups are
  welcome — just scope them with the condition that makes them relevant ("If you're
  developing on Windows, …", "If your charts live on a Raspberry Pi microSD, …").
  Skip anything truly unique to your one machine. Add it in its own small
  `docs(lessons): …` PR. When an existing entry has gone **wrong or stale** — the
  tooling or code moved, or it's genuinely unclear — fix or prune it the same way:
  verify it actually misleads first (it bit you, or you checked it against current
  code/tooling), then correct it (or remove it if obsolete) with a one-line note on
  what changed. Don't reword on suspicion or for style — the bar for editing is the
  same as for adding.

## Hard-won knowledge → read the lessons log

The non-obvious, time-wasting traps that took real effort to discover live in
[`docs/freeboard/DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md),
grouped by the **phase of work** they bite in. **Read it — skipping it wastes real
time and tokens.** As you enter each phase, (re-)read the matching section:

- *reading / exploring the code* · *coding* · *testing* · *building & running
  locally* · *submitting a PR* — plus *environment-specific* lessons scoped by
  condition (Windows, Raspberry Pi microSD, …).

Hit a new trap? Add it back — see *Share what you learned* under
*Contributing — PR standards* above.

## DeepWiki (warm up your context)

[DeepWiki](https://deepwiki.com/) maintains an AI-readable wiki of this repo and
**re-scans Freeboard-SK weekly**, so it's a fast way to orient before diving into
the code. Use the DeepWiki MCP (or the web URLs) before guessing at architecture:

| Repo (MCP name) | URL | For |
|---|---|---|
| `SignalK/freeboard-sk` | https://deepwiki.com/SignalK/freeboard-sk | Freeboard architecture, modules, data flow |
| `SignalK/signalk-server` | https://deepwiki.com/SignalK/signalk-server | server architecture, plugin system, REST/WS APIs |
| `SignalK/specification` | https://deepwiki.com/SignalK/specification | path semantics, delta/full formats, schema |

## Documentation index

**Freeboard-specific** (`docs/freeboard/`):
- [`feature-browser.md`](docs/freeboard/feature-browser.md) — the Feature Browser and
  its `features/` corpus + change ledger: how to author a feature doc and record a
  change (the hand-authoring contract).
- [`freeboard-plotter-ext-support.md`](docs/freeboard/freeboard-plotter-ext-support.md)
  — Freeboard's host implementation of the Plotter Extensions API (incl. the
  `routes` capability).
- [`freeboard-symbol-support.md`](docs/freeboard/freeboard-symbol-support.md) — how
  Freeboard consumes custom map symbols.
- [`DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md) — the lessons
  log: non-obvious, repo-specific traps grouped by work phase (reading, coding,
  testing, building, PR). The *Hard-won knowledge* section above points here; read
  the section matching your current phase.

**Host-agnostic API specs** (`docs/api/`):
- [`plotter-extensions-api.md`](docs/api/plotter-extensions-api.md) — the Plotter
  Extensions API contract.
- [`plotter_extension_provider_plugins.md`](docs/api/plotter_extension_provider_plugins.md)
  — guide for plugin authors providing extensions.
- [`symbols-api.md`](docs/api/symbols-api.md) — the `symbols` resource type.

**General Signal K knowledge** (`docs/signalk/`) — *skip any you already know; they
exist so contributors new to the Signal K ecosystem don't burn context relearning
it*:
- [`extension-model.md`](docs/signalk/extension-model.md) — how the server
  discovers and serves plugins/webapps.
- [`local-dev-environment.md`](docs/signalk/local-dev-environment.md) — running a
  local server and linking a dev build into it.
- [`plugin-publishing.md`](docs/signalk/plugin-publishing.md) — packaging for npm
  and the App Store.
- [`unit-preferences.md`](docs/signalk/unit-preferences.md) — displaying values in the
  user's preferred units via `formatValueForDisplay()`. Read before adding or changing
  any UI that shows a numeric value.

**Developer tooling** (`docs/dev-tools/`):
- [`fsk-mcp.md`](docs/dev-tools/fsk-mcp.md) — one-time setup for the `dev-tools/fsk-mcp`
  MCP bridge that lets an agent drive a running Freeboard-SK (map view, routes,
  filters, live data) during debugging. Read once when wiring it up.
