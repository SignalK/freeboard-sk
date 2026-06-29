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

## Hard-won knowledge (read this — it saves time and tokens)

Non-obvious facts about this project that took real effort to discover:

- **`ng build` / `ng test` don't exit** (esbuild keeps the loop alive) → use
  `npm run build:web` / `npm run test:ci`, never the raw Angular commands, for
  anything that must terminate. (This is why those wrappers exist.)
- **A PR title is literally a line in the App Store Changelog.** The chain is: *PR
  title → GitHub auto-generated release notes (on a `v*` tag) → App Store Changelog
  tab*, colour-coded by `feat`/`fix`/breaking prefix. This is the real reason the
  title convention and one-change-per-PR rules matter so much. (Details:
  [`docs/signalk/plugin-publishing.md`](docs/signalk/plugin-publishing.md).)
- **CodeRabbit reviews the PR *branch*, not the merged result.** It diffs against
  the merge-base and reads context from the head branch — so if `master` moved
  after you branched, CR (and CI) reason about a stale tree. **Rebase onto current
  `master` before relying on a re-review**, or it may flag issues already fixed
  elsewhere.
- **Angular signals in `effect()`:** reading *and* writing the same signal inside an
  effect creates a feedback loop. Read the current value non-reactively (e.g. a
  plain getter / snapshot method) when an effect also mutates that state.
- **Build outputs are gitignored** (`public/`, `plugin/`); the server serves
  `public/` at the package mount point. See
  [`docs/signalk/extension-model.md`](docs/signalk/extension-model.md) for the
  base-path rule.

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
- [`freeboard-plotter-ext-support.md`](docs/freeboard/freeboard-plotter-ext-support.md)
  — Freeboard's host implementation of the Plotter Extensions API (incl. the
  `routes` capability).
- [`freeboard-symbol-support.md`](docs/freeboard/freeboard-symbol-support.md) — how
  Freeboard consumes custom map symbols.

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
