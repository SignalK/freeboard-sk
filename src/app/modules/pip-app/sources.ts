import { PipAppSource } from './types';

const isHttp = (u: URL) => u.protocol === 'http:' || u.protocol === 'https:';

/** Validate a stored or supplied source; anything unusable returns null. */
export function parseSource(input: unknown): PipAppSource | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string, unknown>;
  if (s.kind === 'webapp' && typeof s.path === 'string') {
    // URL parsing treats '\\' as '/', so '/\\host' would leave the server.
    return s.path.startsWith('/') &&
      !s.path.startsWith('//') &&
      !s.path.includes('\\')
      ? { kind: 'webapp', path: s.path }
      : null;
  }
  if (s.kind === 'url' && typeof s.url === 'string') {
    try {
      return isHttp(new URL(s.url)) ? { kind: 'url', url: s.url } : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Turn what a user typed into a source: a path starting with a single `/` is a
 * webapp on the Signal K server, anything else must be an absolute http(s) URL.
 */
export function sourceFromInput(text: string): PipAppSource | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  return t.startsWith('/')
    ? parseSource({ kind: 'webapp', path: t })
    : parseSource({ kind: 'url', url: t });
}

/** Absolute URL a source loads, or null when it does not resolve to http(s). */
export function resolveSourceUrl(
  source: PipAppSource,
  hostUrl: string
): string | null {
  try {
    if (source.kind === 'webapp') {
      const base = new URL(hostUrl);
      const u = new URL(source.path, base);
      // A webapp path must stay on the Signal K server.
      return isHttp(u) && u.origin === base.origin ? u.href : null;
    }
    const u = new URL(source.url);
    return isHttp(u) ? u.href : null;
  } catch {
    return null;
  }
}

/** A page served over https cannot frame an http URL. */
export function isMixedContent(url: string, pageProtocol: string): boolean {
  try {
    return pageProtocol === 'https:' && new URL(url).protocol === 'http:';
  } catch {
    return false;
  }
}

/** Short label for a source, used when the user gives no title. */
export function defaultTitle(source: PipAppSource): string {
  if (source.kind === 'webapp') {
    const parts = source.path.split('/').filter((p) => p);
    // npm scoped package: '/@scope/name/...'
    const name = parts[0]?.startsWith('@')
      ? parts.slice(0, 2).join('/')
      : parts[0];
    try {
      return name ? decodeURIComponent(name) : source.path;
    } catch {
      return name;
    }
  }
  try {
    return new URL(source.url).host;
  } catch {
    return source.url;
  }
}
