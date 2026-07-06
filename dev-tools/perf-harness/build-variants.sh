#!/usr/bin/env bash
# Build two variants of Freeboard-SK side by side for before/after profiling:
#   builds/candidate  = current working tree (your changes)
#   builds/baseline   = working tree with tracked changes stashed (pre-change)
#
# Safe: stashes only tracked src/ changes (the harness under dev-tools/ is left
# alone), and pops the stash + rebuilds afterwards. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root (harness lives two levels down)
HARNESS=dev-tools/perf-harness

echo "==> building candidate (current tree)"
npm run build >/dev/null
rm -rf "$HARNESS/builds/candidate" && cp -R public "$HARNESS/builds/candidate"

if [ -n "$(git status --porcelain -- src 2>/dev/null)" ]; then
  echo "==> stashing tracked changes, building baseline"
  git stash push -m perf-baseline -- src >/dev/null
  trap 'git stash pop >/dev/null 2>&1 || true' EXIT
  npm run build >/dev/null
  rm -rf "$HARNESS/builds/baseline" && cp -R public "$HARNESS/builds/baseline"
  git stash pop >/dev/null
  trap - EXIT
  echo "==> restoring candidate build into public/"
  npm run build >/dev/null
else
  echo "==> no tracked changes: baseline == candidate"
  rm -rf "$HARNESS/builds/baseline" && cp -R public "$HARNESS/builds/baseline"
fi
echo "==> done: builds/baseline and builds/candidate ready"
