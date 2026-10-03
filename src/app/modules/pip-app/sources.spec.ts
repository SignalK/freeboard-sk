import { describe, expect, it } from 'vitest';
import { normalisePipApps } from './defs';
import {
  defaultTitle,
  isMixedContent,
  parseSource,
  resolveSourceUrl,
  sourceFromInput
} from './sources';

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

  it('rejects other schemes, protocol-relative and bare words', () => {
    expect(sourceFromInput('javascript:alert(1)')).toBeNull();
    expect(sourceFromInput('file:///etc/passwd')).toBeNull();
    expect(sourceFromInput('//evil.example')).toBeNull();
    expect(sourceFromInput('wifish')).toBeNull();
    expect(sourceFromInput('')).toBeNull();
  });
});

describe('parseSource', () => {
  it('rejects malformed stored sources', () => {
    expect(parseSource({ kind: 'webapp', path: 'no-slash' })).toBeNull();
    expect(parseSource({ kind: 'url', url: 'data:text/html,x' })).toBeNull();
    expect(parseSource({ kind: 'other' })).toBeNull();
    expect(parseSource('x')).toBeNull();
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
  const ok = {
    id: 'a',
    title: 'Sounder',
    source: { kind: 'webapp', path: '/signalk-wifish/' },
    rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }
  };

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

  it('defaults a missing title and tolerates a non-array', () => {
    expect(normalisePipApps([{ ...ok, title: 5 }])[0].title).toBe('');
    expect(normalisePipApps(undefined)).toEqual([]);
    expect(normalisePipApps({})).toEqual([]);
  });
});
