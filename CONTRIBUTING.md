# Contributing to Freeboard-SK

Freeboard-SK is an Open Source project and contributions are welcome. Contributions
are made via Pull Requests on the [GitHub repository](https://github.com/SignalK/freeboard-sk).

_**Working on your first Pull Request?**_ Learn how from this free series:
[How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

## Detailed guidelines

[`AGENTS.md`](AGENTS.md) holds the detailed coding, commit, and PR guidelines.
It's written primarily as explicit guardrails for AI coding assistants, but the
content is equally relevant to human contributors — code-quality principles, the
build/test workflow, contribution standards, and hard-won project knowledge. Don't
worry if some instructions seem very specific; as a human, use your judgment — the
spirit matters more than the letter.

## Running the development server

Freeboard-SK is an [Angular](https://angular.dev/) app. Installing the Angular CLI
globally is recommended: `npm i -g @angular/cli@latest`.

1. Clone the repository and install dependencies:
   ```sh
   git clone https://github.com/SignalK/freeboard-sk
   cd freeboard-sk
   npm i
   ```
2. Start the dev server and open `http://localhost:4200`:
   ```sh
   npm start
   ```
   The app reloads as you edit source files.

In development mode the app connects to the Signal K server in the browser URL. To
target a specific server, edit the `DEV_SERVER` object (`host`/`port`/`ssl`) in
`src/app/app.facade.ts` — this applies in **development mode only**. To run a local
Signal K server to develop against, see
[`docs/signalk/local-dev-environment.md`](docs/signalk/local-dev-environment.md).

To build for release: `npm run build:prod` (webapp → `public/`, helper plugin →
`plugin/`). See the README for details.

## Submitting a Pull Request

Before you open a PR (full detail in [`AGENTS.md`](AGENTS.md)):

> **As you work each phase — coding, testing, building — skim the matching section
> of [`docs/freeboard/DEV-LESSONS-LEARNED.md`](docs/freeboard/DEV-LESSONS-LEARNED.md)
> first.** It records non-obvious, repo-specific traps that cost earlier
> contributors real time (a hung `ng build`, a single-spec run that won't resolve
> path aliases, a JSON import that bloats the bundle). Reading the relevant section
> up front is the cheapest way to avoid re-discovering them.

1. [Fork](https://help.github.com/articles/fork-a-repo/) the repo and branch from
   the latest `master`: `git checkout -b my-fix-branch master`.
2. **One logical change per PR.** Split unrelated work into separate PRs — if the
   changes would be two changelog entries, they're two PRs.
3. **Do not change version numbers** — maintainers handle versioning at release.
4. Add or extend tests for new behaviour, and run them:
   ```sh
   npm run format
   npm run build:all
   npm run test:ci      # runs tests once and exits (not `npm test`, which watches)
   ```
5. Commit with `type(scope): subject` messages (imperative, present tense). Keep
   history clean — amend fixups rather than chaining "oops" commits.
6. Push and open the PR.
   - **The title becomes a line in the release notes / App Store Changelog** — make
     it descriptive and user-facing.
   - Keep the description succinct: the motivation (why) and the approach (how), not
     the mechanics (what). Include before/after screenshots for UI changes. If you
     use AI, **trim the fluff** — maintainers will ask if they need more.
7. [CodeRabbit](https://coderabbit.ai/) reviews automatically; address its comments.
   If changes are requested, rebase and force-push to update the PR:
   ```sh
   git fetch origin && git rebase origin/master
   git push -f
   ```
