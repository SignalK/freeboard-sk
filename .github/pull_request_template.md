<!--
Before opening this PR, please consider:

- One logical change per PR. If this bundles unrelated fixes/features, split it —
  each PR becomes one App Store Changelog entry (generated from the PR title).
- Every PR costs maintainer review time. Bug fixes that affect real users and
  clearly-scoped features are always welcome; refactors or "improvements" without
  a concrete problem being solved are likely to be closed.
- Do NOT change version numbers — maintainers handle versioning at release.
- Keep this description succinct. The diff shows WHAT changed; tell us WHY and
  briefly HOW. If you used AI, trim the fluff — we'll ask if we need more.

See CONTRIBUTING.md / AGENTS.md for the full guidelines.
-->

## What problem does this solve?

<!-- The bug, limitation, or user-facing need this addresses. -->

## How does it work?

<!-- Briefly, the approach. Note any breaking changes. -->

## How was this tested?

<!-- How you verified it. New behaviour should have tests (npm run test:ci).
     Include before/after screenshots for visible UI changes. -->

## Checklist

- [ ] One logical change; version numbers untouched.
- [ ] Skimmed [`DEV-LESSONS-LEARNED.md`](../docs/freeboard/DEV-LESSONS-LEARNED.md) for traps relevant to this change.
- [ ] Tests added/updated for new behaviour and `npm run test:ci` passes.
