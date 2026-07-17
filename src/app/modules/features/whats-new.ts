/**
 * "What's New" seen-state: pure logic.
 *
 * The passive indicator lights when the feature ledger contains change events
 * the user has not yet seen. Seen-state is keyed on individual change events
 * (`<feature-id>:<pr>`), not bare feature ids, so a feature legitimately
 * becomes "new again" when a later release enhances it.
 *
 * Kept free of Angular/DOM dependencies so it is unit-tested directly.
 */

import { CompiledFeature } from './feature-corpus';

/** Every change event in the corpus as a stable `<feature-id>:<pr>` key. */
export function eventKeys(features: CompiledFeature[]): string[] {
  const keys: string[] = [];
  for (const f of features) {
    for (const e of f.events) {
      keys.push(`${f.id}:${e.pr}`);
    }
  }
  return keys;
}

/**
 * The corpus' current events that are missing from the stored seen list.
 *
 * A missing/invalid stored value (a first-ever run) means NOTHING has been
 * seen — every event is unseen, so a new user gets a lit bulb pointing them
 * at the Feature Browser once; opening it marks everything seen.
 */
export function unseenEvents(current: string[], stored: unknown): string[] {
  if (!Array.isArray(stored)) {
    return current;
  }
  const seen = new Set(stored.filter((k) => typeof k === 'string'));
  return current.filter((k) => !seen.has(k));
}
