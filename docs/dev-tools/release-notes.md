# Release-notes generator (`dev-tools/changelog`)

Generates a rich **GitHub Release body** from the feature ledger
(`features/changelog.json`) that powers the [Feature Browser](../freeboard/feature-browser.md).
The Signal K App Store's "Changelog" tab renders that Release body as Markdown, so
this is what users read for each release. It replaces GitHub's flat auto-generated
notes.

Dev-only (in `dev-tools/`, excluded from the npm package). Plain Node — no runtime
dependencies; it shells out to `git`.

## Commands

```bash
node dev-tools/changelog/index.mjs stamp [version]      # write since values into the ledger
node dev-tools/changelog/index.mjs render <tag> [--out <file>]   # print/write the Release body
```

### `stamp [version]`

Fills the blank `since` on ledger rows with `version` (default: the `package.json`
version). For a **stable** version it also **graduates** that version's pre-releases —
every `v3.0.0-beta.*` / `-rc.*` row's `since` is rewritten to `v3.0.0` — so the stable
release's notes (and the Feature Browser's "Since" column) absorb everything that
landed across its betas. A pre-release version only fills blanks.

It runs automatically from the **`version` npm lifecycle hook**, which re-stages the
stamped `features/changelog.json` into the version-bump commit — so `npm version …`
stamps with no manual step.

### `render <tag>`

Prints the Release body for `<tag>` to **stdout** (or `--out <file>`). It never
touches GitHub, so `render <tag> > preview.md` is a safe **dry run**. Sections:

- **🚀 New Features** — features with a `new` row in this release (doc title + summary).
- **✨ Improvements** — features enhanced (only) in this release.
- **🐛 Bug Fixes / 🔧 Other Changes** — PRs merged in the tag range that are **not** in
  the ledger, grouped by conventional-commit type.

The tag range's lower bound is the previous **stable** tag for a stable release (so it
spans all the betas) or the previous tag of any kind for a pre-release. `render` reads
the ledger as-is, so **stamp first** (the `version` hook does this at release; for a
manual dry run, `stamp` then `git checkout features/changelog.json` when done).

## Dry run

```bash
node dev-tools/changelog/index.mjs stamp v3.0.0     # graduates betas (mutates the ledger)
node dev-tools/changelog/index.mjs render v3.0.0    # preview the notes
git checkout features/changelog.json                # discard the dry-run stamp
```

> ⚠️ The final `git checkout` discards **all** uncommitted changes to
> `features/changelog.json` — not just the dry-run stamp. Commit or stash any
> pending ledger edits before a dry run (or run it in a throwaway worktree).

## Release wiring

`release.yml` (on a `v*` tag push) runs `render <tag> --out RELEASE_NOTES.md` and passes
it to `action-gh-release` via `body_path`. `generate_release_notes` stays **off** so
features aren't listed twice. A bad render is never stuck — the Release body is freely
editable after publish and is independent of the (immutable) npm publish.

## Tests

Pure logic lives in `lib.mjs` and is unit-tested in `lib.spec.mjs`
(`npm run test:tools`, a standalone Vitest config). The `.github/workflows/tools.yml`
job runs it on PRs that touch `dev-tools/` (or the tooling's dependencies/workflow).
</content>
