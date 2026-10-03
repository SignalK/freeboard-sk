import { describe, it, expect } from 'vitest';
import {
  isPrerelease,
  compareVersions,
  previousBoundary,
  stampLedger,
  serializeLedger,
  stripTypePrefix,
  parseCommitSubject,
  docSummary,
  renderNotes,
  latestTag,
  undocumentedPRs
} from './lib.mjs';

describe('isPrerelease', () => {
  it('detects a pre-release tag', () => {
    expect(isPrerelease('v3.0.0-beta.1')).toBe(true);
    expect(isPrerelease('v3.0.0')).toBe(false);
  });
});

describe('compareVersions', () => {
  it('ranks a release above its pre-releases and orders numerically', () => {
    expect(compareVersions('v3.0.0', 'v3.0.0-beta.1')).toBe(1);
    expect(compareVersions('v3.0.0-beta.2', 'v3.0.0-beta.10')).toBe(-1);
    expect(compareVersions('v2.9.0', 'v3.0.0')).toBe(-1);
  });
});

describe('previousBoundary', () => {
  const tags = ['v2.9.0', 'v3.0.0-beta.0', 'v3.0.0-beta.1', 'v3.0.0'];
  it('uses the previous STABLE tag for a stable release', () => {
    expect(previousBoundary(tags, 'v3.0.0')).toBe('v2.9.0');
  });
  it('uses the previous tag of any kind for a pre-release', () => {
    expect(previousBoundary(tags, 'v3.0.0-beta.1')).toBe('v3.0.0-beta.0');
  });
  it('returns null when there is no earlier stable', () => {
    expect(previousBoundary(['v3.0.0-beta.0'], 'v3.0.0')).toBeNull();
  });
});

describe('stampLedger', () => {
  const rows = [
    { feature: 'a', pr: 1, kind: 'new', since: 'v3.0.0-beta.1', title: 'x' },
    { feature: 'b', pr: 2, kind: 'enhanced', title: 'y' }, // blank since
    { feature: null, pr: 3, kind: 'skip', reason: 'r' }
  ];

  it('a pre-release only fills blanks (no graduation)', () => {
    const out = stampLedger(rows, 'v3.0.0-beta.5');
    expect(out[0].since).toBe('v3.0.0-beta.1');
    expect(out[1].since).toBe('v3.0.0-beta.5');
    expect(out[2]).toEqual(rows[2]); // skip untouched
  });

  it('a stable release fills blanks AND graduates its pre-releases', () => {
    const out = stampLedger(rows, 'v3.0.0');
    expect(out[0].since).toBe('v3.0.0'); // beta.1 graduated
    expect(out[1].since).toBe('v3.0.0'); // blank filled
    expect(out[2].kind).toBe('skip');
  });

  it("does not graduate another version's pre-releases", () => {
    const out = stampLedger(
      [{ feature: 'a', pr: 1, kind: 'new', since: 'v2.9.0-beta.1' }],
      'v3.0.0'
    );
    expect(out[0].since).toBe('v2.9.0-beta.1');
  });
});

describe('serializeLedger', () => {
  it('emits one canonical-order row per line', () => {
    const out = serializeLedger([
      { pr: 1, feature: 'a', title: 't', kind: 'new', since: 'v1.0.0' },
      { feature: null, pr: 2, kind: 'skip', reason: 'r' }
    ]);
    expect(out).toBe(
      '[\n' +
        '  { "feature": "a", "pr": 1, "kind": "new", "since": "v1.0.0", "title": "t" },\n' +
        '  { "feature": null, "pr": 2, "kind": "skip", "reason": "r" }\n' +
        ']\n'
    );
  });

  it('preserves unrecognized fields instead of dropping them', () => {
    const out = serializeLedger([
      { feature: 'a', pr: 1, kind: 'new', custom: 'keep-me' }
    ]);
    expect(out).toBe(
      '[\n  { "feature": "a", "pr": 1, "kind": "new", "custom": "keep-me" }\n]\n'
    );
  });
});

describe('stripTypePrefix / parseCommitSubject / docSummary', () => {
  it('strips a conventional-commit prefix', () => {
    expect(stripTypePrefix('feat(map): Do a thing')).toBe('Do a thing');
    expect(stripTypePrefix('Note: keep this')).toBe('Note: keep this');
  });
  it('parses a squash-merge subject', () => {
    expect(parseCommitSubject('fix(map): guard canvas (#519)')).toEqual({
      type: 'fix',
      title: 'guard canvas',
      pr: 519
    });
    expect(parseCommitSubject('not a conventional subject')).toBeNull();
  });
  it('summarises a doc body to one sentence, images stripped', () => {
    expect(
      docSummary(
        '![Fig 1](x.jpg)\n\nShows **wind** on the chart. More text here.'
      )
    ).toBe('Shows wind on the chart.');
  });
});

describe('renderNotes', () => {
  const ledger = [
    {
      feature: 'weather-overlays',
      pr: 413,
      kind: 'new',
      since: 'v3.0.0',
      title: 'feat(weather): add overlays'
    },
    {
      feature: 'weather-overlays',
      pr: 520,
      kind: 'enhanced',
      since: 'v3.0.0',
      title: 'feat(weather): unify wind indicator'
    },
    {
      feature: 'anchor-watch',
      pr: 300,
      kind: 'enhanced',
      since: 'v3.0.0',
      title: 'feat(nav): add drag alarm'
    },
    {
      feature: 'radar',
      pr: 100,
      kind: 'new',
      since: 'v2.0.0',
      title: 'feat: radar'
    },
    { feature: null, pr: 520, kind: 'skip', reason: 'internal' }
  ];
  const features = {
    'weather-overlays': {
      title: 'Wind and Ocean Currents',
      summary: 'Display wind and ocean-current vectors on the chart.'
    },
    'anchor-watch': { title: 'Anchor Watch', summary: 'Watch the anchor.' },
    radar: { title: 'Radar', summary: 'Radar overlay.' }
  };
  const commits = [
    { type: 'fix', title: 'guard OffscreenCanvas on non-WebGL', pr: 519 },
    { type: 'feat', title: 'add overlays', pr: 413 }, // in ledger → excluded
    { type: 'perf', title: 'speed up tile load', pr: 512 },
    { type: 'chore', title: 'bump deps', pr: 400 }
  ];

  it('renders grouped notes for a release', () => {
    const body = renderNotes({ ledger, features, commits, tag: 'v3.0.0' });
    expect(body).toBe(
      '## 🚀 New Features\n\n' +
        '- **Wind and Ocean Currents** — Display wind and ocean-current vectors on the chart.\n\n' +
        '## ✨ Improvements\n\n' +
        '- **Anchor Watch** — add drag alarm\n\n' +
        '## 🐛 Bug Fixes\n\n' +
        '- guard OffscreenCanvas on non-WebGL (#519)\n\n' +
        '## 🔧 Other Changes\n\n' +
        '- speed up tile load (#512)\n' +
        '- bump deps (#400)\n'
    );
  });

  it('excludes ledger PRs from fixes and skips empty sections', () => {
    const body = renderNotes({
      ledger: [
        { feature: 'x', pr: 1, kind: 'new', since: 'v1.0.0', title: 'feat: x' }
      ],
      features: { x: { title: 'X', summary: 'The X.' } },
      commits: [{ type: 'feat', title: 'x', pr: 1 }], // the only commit is the ledger PR
      tag: 'v1.0.0'
    });
    expect(body).toBe('## 🚀 New Features\n\n- **X** — The X.\n');
  });
});

describe('latestTag', () => {
  it('picks the newest tag of any kind', () => {
    expect(
      latestTag(['v3.1.0', 'v3.2.0-beta.6', 'v3.2.0', 'v3.2.0-beta.5'])
    ).toBe('v3.2.0');
    expect(latestTag(['v3.2.0', 'v3.2.1-beta.0'])).toBe('v3.2.1-beta.0');
  });
  it('returns null when there are no tags', () => {
    expect(latestTag([])).toBeNull();
  });
});

describe('undocumentedPRs', () => {
  const ledger = [
    { feature: 'notes', pr: 10, kind: 'enhanced', since: null },
    { feature: null, pr: 11, kind: 'skip', reason: 'internal' }
  ];
  const commit = (type, pr, title = 'a change') => ({ type, pr, title });

  it('lists feat and perf PRs with no ledger row', () => {
    const commits = [commit('feat', 12), commit('perf', 13)];
    expect(undocumentedPRs({ ledger, commits })).toEqual(commits);
  });
  it('treats any row for the PR as documented, a skip row included', () => {
    const commits = [commit('feat', 10), commit('feat', 11)];
    expect(undocumentedPRs({ ledger, commits })).toEqual([]);
  });
  it('ignores other commit types and commits without a PR', () => {
    const commits = [
      commit('fix', 14),
      commit('docs', 15),
      commit('chore', 16),
      commit('feat', null)
    ];
    expect(undocumentedPRs({ ledger, commits })).toEqual([]);
  });
  it('lists a PR once', () => {
    const commits = [commit('feat', 12, 'first'), commit('feat', 12, 'again')];
    expect(undocumentedPRs({ ledger, commits })).toEqual([commits[0]]);
  });
});
