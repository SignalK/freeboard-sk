/**
 * Auto-refresh interval helpers for a chart resource's `refreshInterval`.
 *
 * The resource carries milliseconds (the unit the chart layers consume, see
 * `startChartTileRefresh` in `modules/map/ol/lib/charts/chart-utils.ts`); the
 * dialogs let the user enter whole minutes. These two functions are the only
 * conversion between the two, so a value entered in one dialog reads back
 * identically in another.
 */

const MINUTE_MS = 60000;

/**
 * Whole minutes for a stored `refreshInterval`, or 0 when the chart does not
 * auto-refresh (absent, non-finite or non-positive). Sub-minute values round
 * up so a provider-declared interval below the floor still reads as 1, which
 * is what the layer actually applies.
 */
export function refreshIntervalMinutes(refreshInterval?: number): number {
  if (
    typeof refreshInterval !== 'number' ||
    !Number.isFinite(refreshInterval) ||
    refreshInterval <= 0
  ) {
    return 0;
  }
  return Math.max(1, Math.round(refreshInterval / MINUTE_MS));
}

/**
 * Stored `refreshInterval` (ms) for a minutes value entered by the user, or
 * `undefined` when the entry means "no auto-refresh" (0, blank, negative or
 * not a number) so the key can be left off the resource. The field is whole
 * minutes, so a fractional entry is not rounded to something the user did not
 * type: it is rejected the same way, and the dialog blocks it before it gets
 * here ({@link isWholeMinutes}).
 */
export function refreshIntervalFromMinutes(
  minutes?: number | string | null
): number | undefined {
  const n = typeof minutes === 'string' ? Number(minutes) : minutes;
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) {
    return undefined;
  }
  return n * MINUTE_MS;
}

/**
 * Whether a minutes entry is one the field accepts: blank (never) or a whole,
 * non-negative number of minutes.
 */
export function isWholeMinutes(minutes?: number | string | null): boolean {
  if (minutes === null || minutes === undefined || minutes === '') {
    return true;
  }
  const n = typeof minutes === 'string' ? Number(minutes) : minutes;
  return Number.isInteger(n) && n >= 0;
}
