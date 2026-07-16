import { describe, it, expect } from 'vitest';
import {
  parseFeatureDoc,
  compileCorpus,
  compareSince,
  sortFeatures,
  filterFeatures,
  nextRowIndex,
  stripTypePrefix,
  categoryHue,
  extractImages,
  CompiledFeature,
  FeatureCorpusPayload
} from './feature-corpus';

const doc = (id: string, front: Record<string, string>, body: string) => ({
  id,
  raw: `---\n${Object.entries(front)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n${body}`
});

describe('parseFeatureDoc', () => {
  it('splits frontmatter scalars from the markdown body', () => {
    const { frontmatter, body } = parseFeatureDoc(
      '---\ntitle: Radar Overlay\ncategory: Radar\n---\nSome **markdown** body.'
    );
    expect(frontmatter).toEqual({ title: 'Radar Overlay', category: 'Radar' });
    expect(body).toBe('Some **markdown** body.');
  });

  it('strips surrounding quotes and ignores comment/blank lines', () => {
    const { frontmatter } = parseFeatureDoc(
      '---\ntitle: "Weather Forecast"\n# a comment\n\ncategory: Weather\n---\nx'
    );
    expect(frontmatter).toEqual({
      title: 'Weather Forecast',
      category: 'Weather'
    });
  });

  it('treats a doc with no frontmatter as all body', () => {
    const { frontmatter, body } = parseFeatureDoc('just body text');
    expect(frontmatter).toEqual({});
    expect(body).toBe('just body text');
  });
});

describe('compareSince', () => {
  it('orders versions numerically and sorts unreleased oldest', () => {
    expect(compareSince('v2.10.0', 'v2.9.0')).toBe(1);
    expect(compareSince('v2.2.0', 'v2.10.0')).toBe(-1);
    expect(compareSince('v2.1', 'v2.1.1')).toBe(-1);
    expect(compareSince(null, 'v1.0.0')).toBe(-1);
    expect(compareSince('v1.0.0', null)).toBe(1);
    expect(compareSince(null, null)).toBe(0);
  });

  it('ranks a release above its pre-releases', () => {
    expect(compareSince('v3.0.0', 'v3.0.0-beta.1')).toBe(1);
    expect(compareSince('v3.0.0-beta.1', 'v3.0.0')).toBe(-1);
    expect(compareSince('v3.0.0-beta.2', 'v3.0.0-beta.10')).toBe(-1);
    expect(compareSince('v3.0.0-beta.1', 'v3.0.0-rc.1')).toBe(-1);
  });
});

describe('compileCorpus', () => {
  const payload: FeatureCorpusPayload = {
    docs: [
      doc('radar-overlay', { title: 'Radar Overlay', category: 'Radar' }, 'r'),
      doc(
        'current-overlay',
        { title: 'Ocean Current Overlay', category: 'Weather' },
        'c'
      ),
      doc('no-ledger', { title: 'Orphan', category: 'General' }, 'o')
    ],
    ledger: [
      {
        feature: 'radar-overlay',
        pr: 400,
        kind: 'new',
        since: 'v2.14.0',
        date: '2024-09-05',
        title: 'feat(radar): overlay radar returns'
      },
      {
        feature: 'current-overlay',
        pr: 470,
        kind: 'new',
        since: 'v2.28.0',
        date: '2025-02-10',
        title: 'feat(weather): surface ocean-current vectors'
      },
      {
        feature: 'current-overlay',
        pr: 523,
        kind: 'enhanced',
        since: 'v3.0.0',
        date: '2026-05-08',
        title: 'feat(weather): make current arrows customizable symbols'
      },
      { feature: null, pr: 240, kind: 'skip', reason: 'refactor' }
    ]
  };

  it('joins docs with their most recent ledger event', () => {
    const compiled = compileCorpus(payload);
    const current = compiled.find((f) => f.id === 'current-overlay')!;
    expect(current.since).toBe('v3.0.0');
    expect(current.latestKind).toBe('enhanced');
    expect(current.title).toBe('Ocean Current Overlay');
    expect(current.body).toBe('c');
  });

  it('exposes a feature’s PRs newest-first with prefixes stripped', () => {
    const current = compileCorpus(payload).find(
      (f) => f.id === 'current-overlay'
    )!;
    expect(current.events.map((e) => e.pr)).toEqual([523, 470]);
    expect(current.events[0].title).toBe(
      'make current arrows customizable symbols'
    );
    expect(current.events[0].date).toBe('2026-05-08');
  });

  it('takes since/status from the most recent RELEASED event, not an unreleased latest', () => {
    const wx = compileCorpus({
      docs: [doc('wx', { title: 'Wx', category: 'Weather' }, 'b')],
      ledger: [
        {
          feature: 'wx',
          pr: 100,
          kind: 'new',
          since: 'v2.0.0',
          date: '2025-01-01',
          title: 'feat: add wx'
        },
        // merged but not yet tagged → no `since`
        {
          feature: 'wx',
          pr: 200,
          kind: 'enhanced',
          date: '2026-01-01',
          title: 'feat: improve wx'
        }
      ]
    })[0];
    expect(wx.since).toBe('v2.0.0');
    expect(wx.latestKind).toBe('new');
    // the unreleased PR still appears in the history, newest-first
    expect(wx.events.map((e) => e.pr)).toEqual([200, 100]);
  });

  it('includes a doc with no ledger events (since/kind null)', () => {
    const orphan = compileCorpus(payload).find((f) => f.id === 'no-ledger')!;
    expect(orphan.since).toBeNull();
    expect(orphan.latestKind).toBeNull();
  });

  it('ignores skip rows and never emits a phantom feature', () => {
    const compiled = compileCorpus(payload);
    expect(compiled).toHaveLength(3);
    expect(compiled.some((f) => f.id === null || !f.id)).toBe(false);
  });

  it('handles an empty corpus', () => {
    expect(compileCorpus({ docs: [], ledger: [] })).toEqual([]);
  });
});

describe('sortFeatures', () => {
  const feats: CompiledFeature[] = [
    mk('a', 'Alpha', 'Radar', 'v2.1.0'),
    mk('b', 'Bravo', 'Weather', 'v3.0.0'),
    mk('c', 'Charlie', 'Alarms', null)
  ];

  it('sorts by since newest-first by default (desc), unreleased last', () => {
    const ids = sortFeatures(feats, 'since', 'desc').map((f) => f.id);
    expect(ids).toEqual(['b', 'a', 'c']);
  });

  it('sorts by title ascending', () => {
    const ids = sortFeatures(feats, 'title', 'asc').map((f) => f.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const copy = [...feats];
    sortFeatures(feats, 'category', 'asc');
    expect(feats).toEqual(copy);
  });

  it('keeps the title tie-break ascending even when the primary sort is desc', () => {
    const same = [
      mk('z', 'Zulu', 'X', 'v1.0.0'),
      mk('a', 'Alpha', 'X', 'v1.0.0')
    ];
    expect(sortFeatures(same, 'since', 'desc').map((f) => f.id)).toEqual([
      'a',
      'z'
    ]);
  });
});

describe('filterFeatures', () => {
  const feats: CompiledFeature[] = [
    mk('a', 'Radar Overlay', 'Radar', 'v2.1.0', 'shows echoes'),
    mk('b', 'Weather Forecast', 'Weather', 'v3.0.0', 'wind and rain')
  ];

  it('matches title, category, or body, case-insensitively', () => {
    expect(filterFeatures(feats, 'RADAR').map((f) => f.id)).toEqual(['a']);
    expect(filterFeatures(feats, 'rain').map((f) => f.id)).toEqual(['b']);
    expect(filterFeatures(feats, 'weather').map((f) => f.id)).toEqual(['b']);
  });

  it('returns everything for a blank query', () => {
    expect(filterFeatures(feats, '  ')).toHaveLength(2);
  });
});

describe('extractImages', () => {
  it('collects images in order and removes only the first from the body', () => {
    const { images, body } = extractImages(
      'Intro.\n\n![Fig 1](a.jpg)\n\nMiddle.\n\n![Fig 2](b.jpg)\n\nEnd.'
    );
    expect(images).toEqual([
      { alt: 'Fig 1', url: 'a.jpg' },
      { alt: 'Fig 2', url: 'b.jpg' }
    ]);
    expect(body).toContain('![Fig 2](b.jpg)');
    expect(body).not.toContain('a.jpg');
    expect(body.startsWith('Intro.')).toBe(true);
  });

  it('leaves a body with no images untouched', () => {
    const { images, body } = extractImages('Just prose.');
    expect(images).toEqual([]);
    expect(body).toBe('Just prose.');
  });
});

describe('stripTypePrefix', () => {
  it('removes a conventional-commit type/scope prefix', () => {
    expect(stripTypePrefix('feat(map): Title goes here')).toBe(
      'Title goes here'
    );
    expect(stripTypePrefix('fix: something broke')).toBe('something broke');
    expect(stripTypePrefix('perf(radar)!: faster draw')).toBe('faster draw');
  });

  it('leaves a title without a recognised prefix unchanged', () => {
    expect(stripTypePrefix('Just a plain title')).toBe('Just a plain title');
    expect(stripTypePrefix('Note: read this')).toBe('Note: read this');
  });
});

describe('categoryHue', () => {
  const cats = [
    { name: 'Weather', hue: 200 },
    { name: 'Radar', hue: 110 }
  ];

  it('returns the deliberate hue for a known category', () => {
    expect(categoryHue(cats, 'Weather')).toBe(200);
    expect(categoryHue(cats, 'Radar')).toBe(110);
  });

  it('falls back to a stable in-range hash for an unknown category', () => {
    const h = categoryHue(cats, 'Mystery');
    expect(h).toBe(categoryHue(cats, 'Mystery'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});

describe('nextRowIndex', () => {
  it('moves down and up without wrapping, clamped to bounds', () => {
    expect(nextRowIndex(0, 'ArrowDown', 3)).toBe(1);
    expect(nextRowIndex(2, 'ArrowDown', 3)).toBe(2); // already last
    expect(nextRowIndex(1, 'ArrowUp', 3)).toBe(0);
    expect(nextRowIndex(0, 'ArrowUp', 3)).toBe(0); // already first
  });

  it('returns -1 for an empty list', () => {
    expect(nextRowIndex(0, 'ArrowDown', 0)).toBe(-1);
  });
});

function mk(
  id: string,
  title: string,
  category: string,
  since: string | null,
  body = ''
): CompiledFeature {
  return {
    id,
    title,
    category,
    body,
    since,
    latestKind: since ? 'new' : null,
    events: [],
    images: []
  };
}
