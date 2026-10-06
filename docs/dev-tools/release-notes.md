# Releases and release notes

Releases go through release-please (`.github/workflows/release-please.yml`). Its
release notes are the titles of the PRs merged since the last release, with their
authors, the same list GitHub generates. They are the release PR's description and,
once that PR is merged, the GitHub Release body, which the Signal K App Store's
"Changelog" tab shows. A PR's title is therefore its release-notes line.

## Release wiring

Every push to `master` refreshes one release PR that proposes the next beta; merging
it tags the release and creates the GitHub Release. **Run workflow** on that workflow
turns the PR into the stable release of the current beta instead, which also
graduates the betas' ledger rows (see `stamp` below). It refuses when a `feat`, `fix`
or `perf` PR has been merged since that beta, because the stable release is `master`
as it is now and those changes were never in a beta: release another beta first.
Docs, chores and dependency updates don't block it. To promote anyway, push an empty
commit with a `Release-As: X.Y.Z` footer to `master` by hand.

A tag created by release-please starts no workflows, so `release-please.yml`
dispatches `release.yml` on the new tag, which publishes it to npm (`beta` dist-tag
for a `-beta.N` / `-rc.N` version). For a `v*` tag pushed by hand, `release.yml` also
creates the GitHub Release, with GitHub's generated notes.

### When the tag and Release exist but npm has no package

The npm publish is the last step and can fail on its own: the `publish` job of
`release-please.yml` might not have dispatched `release.yml`, or `release.yml`'s own
`publish` job might have failed. To recover:

1. Check what npm has:
   `npm view @signalk/freeboard-sk@X.Y.Z version` (empty or E404 = not published) and
   `npm view @signalk/freeboard-sk dist-tags` (`beta` for a beta, `latest` for a
   stable release).
2. If the version is missing, run `release.yml` on the tag: **Actions → Release → Run
   workflow → Use workflow from → Tags → vX.Y.Z**, or
   `gh workflow run release.yml --ref vX.Y.Z`. If the run that failed is still
   there, **Re-run failed jobs** on it does the same.
3. If the version is there but a dist-tag is wrong, fix the tag rather than
   republishing (a published version can't be published again):
   `npm dist-tag add @signalk/freeboard-sk@X.Y.Z latest`.

## Stamping the feature ledger (`dev-tools/changelog`)

The feature ledger (`features/changelog.json`) feeds the in-app
[Feature Browser](../freeboard/feature-browser.md), not the release notes. Its rows
carry the release each change shipped in (`since`), which is filled in at release time:

```bash
node dev-tools/changelog/index.mjs stamp [version]   # write since values into the ledger
```

`stamp` fills the blank `since` on ledger rows with `version` (default: the
`package.json` version). For a **stable** version it also **graduates** that
version's pre-releases — every `v3.0.0-beta.*` / `-rc.*` row's `since` is rewritten
to `v3.0.0` — so the Feature Browser's "Since" column absorbs everything that landed
across its betas. A pre-release version only fills blanks.

It runs automatically from the **`version` npm lifecycle hook**, which re-stages the
stamped `features/changelog.json` into the version-bump commit. release-please bumps
the version without npm, so `release-please.yml` runs the same stamp on every
release PR. A ledger row added after the release PR was last refreshed is stamped
with the next release instead.

Dev-only (in `dev-tools/`, excluded from the npm package). Plain Node, no runtime
dependencies. The pure logic lives in `lib.mjs` and is unit-tested in `lib.spec.mjs`
(`npm run test:tools`, a standalone Vitest config); the `.github/workflows/tools.yml`
job runs it on PRs that touch `dev-tools/` (or the tooling's dependencies/workflow).
