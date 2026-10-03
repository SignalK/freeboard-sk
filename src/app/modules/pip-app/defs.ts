import { isValidRect } from './geometry';
import { parseSource } from './sources';
import { PIP_APP_MIN_OPACITY, PipAppDef } from './types';

/** Opacity clamped to the allowed range; anything unusable becomes opaque. */
export function clampOpacity(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(1, Math.max(PIP_APP_MIN_OPACITY, v))
    : 1;
}

/**
 * Keep only well-formed window definitions from stored config: a string id,
 * a usable source and an in-range rectangle. Duplicate ids keep the first;
 * missing or out-of-range display settings fall back to their defaults.
 */
export function normalisePipApps(input: unknown): PipAppDef[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: PipAppDef[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, unknown>;
    const source = parseSource(d.source);
    if (typeof d.id !== 'string' || !d.id || seen.has(d.id)) continue;
    if (!source || !isValidRect(d.rect)) continue;
    seen.add(d.id);
    out.push({
      id: d.id,
      title: typeof d.title === 'string' ? d.title : '',
      source,
      rect: { ...d.rect },
      collapsed: d.collapsed === true,
      opacity: clampOpacity(d.opacity)
    });
  }
  return out;
}
