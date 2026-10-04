import { describe, expect, it } from 'vitest';
import { normalisePipApps } from './defs';
import {
  defaultTitle,
  isMixedContent,
  parseSource,
  resolveSourceUrl,
  sourceFromInput
} from './sources';
import { pipAppDef } from './testing';
import { PipAppDef } from './types';

const host = 'http://boat.local:3000';

describe('sourceFromInput', () => {
  it('treats a leading slash as a webapp on the server', () => {
    expect(sourceFromInput(' /signalk-wifish/ ')).toEqual({
      kind: 'webapp',
      path: '/signalk-wifish/'
    });
  });

  it('accepts absolute http(s) addresses', () => {
    expect(sourceFromInput('https://example.com/x')).toEqual({
      kind: 'url',
      url: 'https://example.com/x'
    });
  });

  it('rejects backslash paths that would resolve off the server', () => {
    expect(sourceFromInput('/\\other.example/')).toBeNull();
    expect(parseSource({ kind: 'webapp', path: '/a\\b' })).toBeNull();
    expect(
      resolveSourceUrl({ kind: 'webapp', path: '/\\other.example/' }, host)
    ).toBeNull();
  });

  it.each([
    ['another scheme', 'javascript:alert(1)'],
    ['a file URL', 'file:///etc/passwd'],
    ['a protocol-relative address', '//evil.example'],
    ['a bare word', 'wifish'],
    ['nothing', '']
  ])('rejects %s', (_, input) => {
    expect(sourceFromInput(input)).toBeNull();
  });
});

describe('parseSource', () => {
  it.each<[string, unknown]>([
    [
      'a webapp path without a leading slash',
      { kind: 'webapp', path: 'no-slash' }
    ],
    ['a non-http URL', { kind: 'url', url: 'data:text/html,x' }],
    ['an unknown kind', { kind: 'other' }],
    ['a non-object', 'x']
  ])('rejects %s', (_, input) => {
    expect(parseSource(input)).toBeNull();
  });
});

describe('resolveSourceUrl', () => {
  it('resolves webapps against the Signal K server', () => {
    expect(
      resolveSourceUrl({ kind: 'webapp', path: '/signalk-wifish/' }, host)
    ).toBe('http://boat.local:3000/signalk-wifish/');
  });

  it('keeps absolute URLs', () => {
    expect(resolveSourceUrl({ kind: 'url', url: 'https://a.b/c' }, host)).toBe(
      'https://a.b/c'
    );
  });
});

describe('isMixedContent', () => {
  it('flags http content on an https page only', () => {
    expect(isMixedContent('http://a.b', 'https:')).toBe(true);
    expect(isMixedContent('https://a.b', 'https:')).toBe(false);
    expect(isMixedContent('http://a.b', 'http:')).toBe(false);
  });
});

describe('defaultTitle', () => {
  it('uses the webapp name or the host', () => {
    expect(defaultTitle({ kind: 'webapp', path: '/@signalk/kip/' })).toBe(
      '@signalk/kip'
    );
    expect(defaultTitle({ kind: 'webapp', path: '/signalk-wifish/' })).toBe(
      'signalk-wifish'
    );
    expect(defaultTitle({ kind: 'url', url: 'https://example.com/a' })).toBe(
      'example.com'
    );
  });
});

describe('normalisePipApps', () => {
  const ok = pipAppDef({ id: 'a', rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } });

  it('keeps valid windows and drops broken or duplicate ones', () => {
    const out = normalisePipApps([
      ok,
      { ...ok }, // duplicate id
      { ...ok, id: 'b', source: { kind: 'url', url: 'ftp://x' } },
      { ...ok, id: 'c', rect: { x: 2, y: 0, w: 0.3, h: 0.3 } },
      { ...ok, id: '' },
      null,
      'junk'
    ]);
    expect(out).toEqual([ok]);
  });

  it('restores a window missing its display settings with the defaults', () => {
    const { id, title, source, rect } = ok;
    expect(normalisePipApps([{ id, title, source, rect }])[0]).toEqual(ok);
  });

  it.each<[string, Record<string, unknown>, keyof PipAppDef, unknown]>([
    ['clamps a too-low opacity up', { opacity: 0.05 }, 'opacity', 0.3],
    ['clamps a too-high opacity down', { opacity: 7 }, 'opacity', 1],
    [
      'treats a non-boolean collapsed as expanded',
      { collapsed: 'yes' },
      'collapsed',
      false
    ],
    ['keeps collapsed', { collapsed: true }, 'collapsed', true],
    ['keeps a popup mark', { popout: 'popup' }, 'popout', 'popup'],
    ['drops an unknown popout mode', { popout: 'tab' }, 'popout', undefined],
    ['keeps a pinned bar', { barPinned: true }, 'barPinned', true],
    [
      'drops a non-boolean barPinned',
      { barPinned: 'yes' },
      'barPinned',
      undefined
    ],
    ['defaults a non-string title', { title: 5 }, 'title', ''],
    [
      'copies only x, y, w and h of the rect',
      { rect: { ...ok.rect, extra: 1 } },
      'rect',
      ok.rect
    ]
  ])('%s', (_, stored, field, expected) => {
    expect(normalisePipApps([{ ...ok, ...stored }])[0][field]).toEqual(
      expected
    );
  });

  it('tolerates a non-array', () => {
    expect(normalisePipApps(undefined)).toEqual([]);
    expect(normalisePipApps({})).toEqual([]);
  });
});
