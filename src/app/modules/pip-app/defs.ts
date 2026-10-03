import { isValidRect } from './geometry';
import { parseSource } from './sources';
import { PipAppDef } from './types';

/**
 * Keep only well-formed window definitions from stored config: a string id,
 * a usable source and an in-range rectangle. Duplicate ids keep the first.
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
      rect: { ...d.rect }
    });
  }
  return out;
}
