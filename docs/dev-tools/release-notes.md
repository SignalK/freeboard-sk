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
node dev-tools/changelog/index.mjs check                # list feat/perf PRs with no ledger row
```

### `stamp [version]`

Fills the blank `since` on ledger rows with `version` (default: the `package.json`
version). For a **stable** version it also **graduates** that version's pre-releases —
every `v3.0.0-beta.*` / `-rc.*` row's `since` is rewritten to `v3.0.0` — so the stable
release's notes (and the Feature Browser's "Since" column) absorb everything that
landed across its betas. A pre-release version only fills blanks.

It runs automatically from the **`version` npm lifecycle hook**, which re-stages the
stamped `features/changelog.json` into the version-bump commit — so `npm version …`
stamps with no manual step. release-please bumps the version without npm, so
`release-please.yml` runs the same stamp on every release PR.

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

### `check`

Lists the `feat`/`perf` PRs merged since the last tag (the newest `v*` tag reachable
from `HEAD`) that have **no row** in the ledger, one per line on stdout, and exits 1
when there are any. Any row for the PR counts, a `skip` row included. This is the
documentation gate: every user-facing change in a release needs a ledger row, or a
`skip` row saying why it doesn't. `release-please.yml` runs it on the release PR (see
below); run it locally on `master` to see what a release would be missing.

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

Releases go through release-please (`release-please.yml`). Every push to `master`
refreshes one release PR that proposes the next beta, with the merged PRs and their
authors as its changelog; merging it tags the release. **Run workflow** on that
workflow turns the PR into the stable release of the current beta instead, which also
graduates the betas' ledger rows (see `stamp`).

After stamping the release PR, the workflow runs `check` on it. It sets a
**`docs/ledger`** commit status on the PR's head commit and keeps one comment on the
PR listing any PRs without a ledger row (a comment, because release-please rewrites
the PR body). The status is a warning, not a required check. **Merge the release PR
only when `docs/ledger` is green.** The check runs after the ledger stamp, so a green
status also means the stamp has landed; merging before it can ship the new rows
unstamped, and they would then appear in the next release's notes instead. Adding the
missing rows on `master` refreshes the PR and re-runs the check.

`release.yml` (for that tag, or for a `v*` tag pushed by hand) runs
`render <tag> --out RELEASE_NOTES.md` and passes it to `action-gh-release` via
`body_path`. `generate_release_notes` stays **off** so features aren't listed twice. A
bad render is never stuck — the Release body is freely editable after publish and is
independent of the (immutable) npm publish.

## Tests

Pure logic lives in `lib.mjs` and is unit-tested in `lib.spec.mjs`
(`npm run test:tools`, a standalone Vitest config). The `.github/workflows/tools.yml`
job runs it on PRs that touch `dev-tools/` (or the tooling's dependencies/workflow).
</content>
