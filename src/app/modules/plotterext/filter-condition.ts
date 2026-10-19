// The condition grammar of `resources.setFilter`, shared by display filters
// and by the `match` of an action's target entry (capability `actions`).

import type { ResourceFilterCondition } from './types';

// Recognised condition operators (see ResourceFilterCondition).
const FILTER_OPS = new Set([
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'contains',
  'regex',
  'exists'
]);

/**
 * A condition is only safe to store/evaluate if it has a string path and a
 * known operator; evalCondition() does `cond.path.split('.')`, so a malformed
 * entry (e.g. {}) would throw during change detection.
 */
export const isValidFilterCondition = (c: unknown): boolean =>
  !!c &&
  typeof c === 'object' &&
  typeof (c as { path?: unknown }).path === 'string' &&
  (c as { path: string }).path.length > 0 &&
  FILTER_OPS.has((c as { op?: unknown }).op as string);

/** Whether `subject` satisfies one condition. */
export function evalCondition(
  cond: ResourceFilterCondition,
  subject: unknown
): boolean {
  let value: unknown = subject;
  for (const seg of cond.path.split('.')) {
    if (value === null || typeof value !== 'object') {
      value = undefined;
      break;
    }
    value = (value as Record<string, unknown>)[seg];
  }
  switch (cond.op) {
    case 'exists':
      return value !== undefined;
    case 'eq':
      return refEquals(value, cond.value, cond.exact);
    case 'ne':
      return !refEquals(value, cond.value, cond.exact);
    case 'lt':
      return typeof value === 'number' && value < (cond.value as number);
    case 'lte':
      return typeof value === 'number' && value <= (cond.value as number);
    case 'gt':
      return typeof value === 'number' && value > (cond.value as number);
    case 'gte':
      return typeof value === 'number' && value >= (cond.value as number);
    case 'in':
      return (
        Array.isArray(cond.value) &&
        cond.value.some((v) => refEquals(value, v, cond.exact))
      );
    case 'contains':
      if (typeof value === 'string') {
        return value.toLowerCase().includes(String(cond.value).toLowerCase());
      }
      return Array.isArray(value) && value.includes(cond.value);
    case 'regex': {
      if (typeof value !== 'string' || typeof cond.value !== 'string') {
        return false;
      }
      // Bound tested input length as a second ReDoS safeguard (resource
      // fields are short; anything larger is not worth matching here).
      if (value.length > 2000) return false;
      const re = compileRegex(cond.value);
      return re ? re.test(value) : false;
    }
    default:
      return false;
  }
}

/**
 * Local id of a symbol-style `namespace:id` reference, or null when the
 * value is not one. The grammar follows the Symbols API alias form: a
 * single colon, `namespace` matching `[A-Za-z0-9_-]+`, and an `id` with no
 * further colon. Multi-colon strings (e.g. `urn:mrn:...`) are NOT symbol
 * references and return null, so URN-like fields keep exact-match semantics.
 */
function symbolLocalId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^[A-Za-z0-9_-]+:([^:]+)$/.exec(value);
  return m ? m[1] : null;
}

/**
 * Equality used by eq/ne/in. Exact match first; then namespace-tolerant
 * matching for symbol references so a filter written against a bare symbol
 * id (`anchorage`) still matches once the host has persisted a
 * fully-qualified alias (`default:anchorage`), and vice versa. Differing
 * namespaces (`custom:x` vs `fsk:x`) never match. Only single-colon
 * `namespace:id` values participate; everything else compares strictly.
 * `exact` opts out of the tolerance and compares strictly.
 */
function refEquals(stored: unknown, target: unknown, exact?: boolean): boolean {
  if (stored === target) return true;
  if (exact) return false;
  // bare target id vs qualified stored reference
  if (typeof target === 'string' && !target.includes(':')) {
    if (symbolLocalId(stored) === target) return true;
  }
  // qualified target reference vs bare stored id
  if (typeof stored === 'string' && !stored.includes(':')) {
    if (symbolLocalId(target) === stored) return true;
  }
  return false;
}

/**
 * Compile a condition regex; invalid or oversized patterns make the condition
 * false. Patterns come from extensions and run synchronously during change
 * detection, so the length bound limits ReDoS exposure (paired with an
 * input-length bound at the call site).
 */
function compileRegex(pattern: string): RegExp | null {
  if (pattern.length > 200) return null;
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}
