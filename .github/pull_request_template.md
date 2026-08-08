<!--
Before opening this PR, please consider:

- One logical change per PR. If this bundles unrelated fixes/features, split it —
  each PR becomes one App Store Changelog entry (generated from the PR title).
- Every PR costs maintainer review time. Bug fixes that affect real users and
  clearly-scoped features are always welcome; refactors or "improvements" without
  a concrete problem being solved are likely to be closed.
- Do NOT change version numbers — maintainers handle versioning at release.
- Do NOT edit `features/` (the Feature Browser corpus / changelog.json) — maintainers
  compile it after merge. Describe the user-facing change below instead.
- Keep this description succinct. The diff shows WHAT changed; tell us WHY and
  briefly HOW. If you used AI, trim the fluff — we'll ask if we need more.

See CONTRIBUTING.md / AGENTS.md for the full guidelines.
-->

## What problem does this solve?

<!-- The bug, limitation, or user-facing need this addresses. -->

## How does it work?

<!-- Briefly, the approach. Note any breaking changes. -->

## What changes for the user?

<!-- Write this for someone using the app, not someone reading the diff: what can they
     now do that they couldn't, where is the control and what is it called, what do they
     see, and why would they want it? Mention any non-obvious interaction with existing
     behaviour.

     This is the text the Feature Browser documentation gets written from after merge,
     so it's worth a few real sentences. Do NOT edit features/ yourself — deciding
     whether this extends an existing feature or is a new one needs the whole corpus in
     view, and that's a maintainer job.

     Skip this section only if the change has no user-visible effect. -->

## How was this tested?

<!-- How you verified it. New behaviour should have tests (npm run test:ci).
     Include before/after screenshots for visible UI changes. -->

## Checklist

- [ ] One logical change; version numbers untouched.
- [ ] `features/` untouched — the user-facing change is described above instead.
- [ ] Skimmed [`DEV-LESSONS-LEARNED.md`](../docs/freeboard/DEV-LESSONS-LEARNED.md) for traps relevant to this change.
- [ ] Tests added/updated for new behaviour and `npm run test:ci` passes.
