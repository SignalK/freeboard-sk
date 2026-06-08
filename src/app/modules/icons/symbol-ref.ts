/** Pure helpers for Symbol resource reference parsing and validation. */

export const RESERVED_DEFAULT_NS = 'default';

/**
 * Parse a symbol reference into namespace and id components.
 * Splits on the FIRST colon only — namespace must not contain colons.
 */
export const parseRef = (
  ref: string
): { namespace?: string; id: string } => {
  const idx = ref.indexOf(':');
  if (idx === -1) {
    return { id: ref };
  }
  return {
    namespace: ref.slice(0, idx),
    id: ref.slice(idx + 1)
  };
};

/** True when the reference contains a namespace qualifier. */
export const isQualified = (ref: string): boolean => ref.includes(':');

/** True when the reference uses the reserved built-in namespace. */
export const isDefaultNs = (ref: string): boolean =>
  ref.startsWith(`${RESERVED_DEFAULT_NS}:`);

/**
 * Return true when the symbol's URL is safe to load.
 * Rejects other-origin absolute URLs and data:/javascript: schemes.
 * Same-origin relative paths and absolute paths beginning with / are allowed.
 */
export const isRenderableSymbol = (sym: {
  mediaType: string;
  url: string;
}): boolean => {
  if (sym.mediaType !== 'image/svg+xml') return false;
  const url = sym.url ?? '';
  if (!url) return false;
  // Reject data: and javascript: schemes
  const lower = url.toLowerCase().trimStart();
  if (lower.startsWith('data:') || lower.startsWith('javascript:')) return false;
  // Reject absolute URLs pointing to other origins
  if (/^https?:\/\//i.test(url)) return false;
  return true;
};
