# Dev lessons learned

Non-obvious, repo-specific traps that cost real time (and, for AI agents, real
tokens) to discover the hard way — captured so the next person pays the cost once,
here. This is the durable companion to [`AGENTS.md`](../../AGENTS.md): that file
points you here at each phase of work; this file holds the detail.

Entries are grouped by the **phase of work** they bite in. When you enter a phase,
read its section. Each entry is a short `### heading`, then **the trap** and **what
to do instead**.

To add an entry, see *Share what you learned* in the
[Contributing standards](../../AGENTS.md) — the bar and scoping rules live there, so
they stay in one place.

---

## When reading / exploring the code

_No entries yet — add one when something here bites you._

---

## When coding

### Reading and writing the same signal inside `effect()` loops

**The trap.** An `effect()` that both reads a signal and writes it creates a
feedback loop — the write re-triggers the effect, which writes again.

**What to do instead.** Read the current value **non-reactively** (a plain getter
or snapshot method) when the same effect also mutates that state, so the read
doesn't register a reactive dependency.

---

## When testing

### `ng test` / `ng build` don't exit

**The trap.** The esbuild-based `ng test` and `ng build` complete successfully but
then fail to terminate — a lingering esbuild service keeps the event loop alive. In
CI that hangs the job to its timeout even though everything passed.

**What to do instead.** Use the exit-safe wrappers — `npm run test:ci` and
`npm run build:web` — never the raw Angular commands, for anything that must
terminate (CI, scripts, an agent verifying a change). Plain `npm test` stays as the
local watch command. (This is why those wrappers exist; see *Build, test, run* in
`AGENTS.md`.)

### Running a single spec file: not with bare vitest — use `ng test --include`

**The trap.** To iterate quickly on one test, the obvious move is
`npx vitest run src/app/.../foo.spec.ts`. It fails with
`Cannot find package 'src/app/...'`, because the `src/` path alias is **not**
resolved by a standalone vitest run — `vitest-base.config.ts` defines no
`resolve.alias` and no tsconfig-paths plugin. Rewriting the spec to use relative
imports doesn't rescue you either: the moment the spec imports anything from the
app graph, that code's own **transitive** `src/…` imports fail the same way.

**Why.** The `src/` alias is supplied by the Angular build pipeline (tsconfig
`paths`), which only applies when tests run through `ng test`. The vitest config the
project ships is intentionally minimal and assumes that pipeline.

**What to do instead.** Run through Angular so the alias resolves. For the whole
suite, the exit-safe wrapper:

```bash
npm run test:ci      # = ng test, with the force-exit wrapper
```

To iterate on **one** spec, you *can* filter — pass the file to `ng test`:

```bash
npx ng test --include "src/app/.../foo.spec.ts"
```

This goes through the Angular pipeline (alias resolves) and runs only that file.
The one catch: like all `ng test`/`ng build` invocations it **won't self-exit**
(see *`ng test` / `ng build` don't exit* above) — `test:ci` is wrapped, this raw
form is not. Background it, wait for the vitest `Test Files` summary, then kill it
(or just Ctrl-C). So **red→green-verifying a regression test is two single-file
runs**, not two full-suite runs — once with the fix reverted (new test fails), once
restored (it passes). Don't reach for `npx vitest` to shortcut it; that's the path
that fails on the alias.

### Unit-testing a DI-heavy service whose constructor calls `effect()`

**The trap.** Services like `PlotterExtensionService` inject a large facade
(`AppFacade`) plus several other collaborators, and call `effect()` in their
constructor. You can't just `new` the class in a spec: `effect()` requires an
Angular injection context, and the facade is far too heavy to hand-build. Going the
other way — bootstrapping the full app via `TestBed` with real providers — drags in
the entire dependency graph and is slow and brittle.

**What to do instead.** Use `TestBed` purely as an injection context, and stub each
constructor dependency with a minimal `useValue`:

```ts
TestBed.configureTestingModule({
  providers: [
    PlotterExtensionService,
    RouteBufferRegistry,                                  // cheap real class — fine
    { provide: AppFacade, useValue: { config: { plotterExtensions: { widgets } }, debug: () => {} } },
    { provide: SignalKClient, useValue: {} },
    { provide: MatDialog, useValue: {} },
    { provide: SKResourceService, useValue: { routes: signal([]) } },
    { provide: MapService, useValue: {} }
  ]
});
const service = TestBed.inject(PlotterExtensionService);
```

`TestBed.inject()` supplies the injection context `effect()` needs, and the stubs
keep the graph tiny. Only stub what the constructor (and the code under test)
actually touches — e.g. an `effect()` that reads `skres.routes()` needs that to be a
callable signal returning `[]`. Drive the real logic via public signals
(`service.manifests.set(...)`) and, where it earns its keep, a narrowly-cast call to
a private method to exercise the genuine code path rather than faking its output.

> Import path: in a spec, import collaborators with **relative** paths
> (`../../app.facade`), not the `src/` alias — see *Running a single spec file*.

---

## When building & running locally

### Build outputs are gitignored

**The trap.** `public/` (the webapp) and `plugin/` (the compiled helper) are build
outputs and are **gitignored** — they won't be in a clean checkout.

**What to do instead.** Build them with `npm run build:web` / `npm run build:helper`
(or `build:all`). The server serves `public/` at the package mount point; see
[`docs/signalk/extension-model.md`](../signalk/extension-model.md) for the base-path
rule.

### Linking the FSK checkout into a server needs `build:all`, not just `build:web`

**The trap.** The package is *both* a `signalk-webapp` and a
`signalk-node-server-plugin`, and its `package.json` `main` is `plugin/index.js`. If
you symlink an FSK dev checkout into a server's `node_modules` with only the webapp
built (`build:web`), the server crashes during plugin registration with
`MODULE_NOT_FOUND` for `…/@signalk/freeboard-sk/plugin/index.js` — the webapp loads
fine, but the missing helper build takes the whole plugin scan down with it, so the
failure looks unrelated to Freeboard.

**What to do instead.** Build **both** sides before linking: `npm run build:all` (or
run `build:helper` alongside `build:web`). The helper compiles to `plugin/`, which is
what `main` resolves to.

---

## When submitting a PR

### A PR title is literally a line in the App Store Changelog

**The trap.** Freeboard's App Store "Changelog" tab is generated from PR titles, not
from any hand-written changelog.

**What to do instead.** Treat the title as a release note. The chain is *PR title →
GitHub auto-generated release notes (on a `v*` tag) → App Store Changelog tab*,
colour-coded by `feat`/`fix`/breaking prefix. This is the real reason the
`type(scope):` title convention and one-change-per-PR rule matter so much. (Details:
[`docs/signalk/plugin-publishing.md`](../signalk/plugin-publishing.md).)

### CodeRabbit reviews the PR branch, not the merged result

**The trap.** CodeRabbit diffs against the merge-base and reads context from the
head branch — so if `master` moved after you branched, CR (and CI) reason about a
stale tree and may flag issues already fixed elsewhere.

**What to do instead.** Rebase onto current `master` before relying on a re-review
(`git fetch && git rebase origin/master`, force-push).

---

## Environment-specific

Lessons that apply to a class of setups rather than everyone. Scope each by the
condition that makes it relevant (e.g. *"If you're developing on Windows, …"*, *"If
your charts live on a Raspberry Pi microSD, …"*).

_No entries yet — add one when a platform or hardware quirk bites you._
