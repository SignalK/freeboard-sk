/** Tenths per zoom level — the precision every level is shown and entered at. */
const ZOOM_DISPLAY_STEPS = 10;

/**
 * A zoom level as the app shows it: truncated to a tenth, never rounded, so
 * every level displayed is one the view has actually reached. Rounding would
 * report z14.0 from z13.95 up, and a chart configured to appear from z14 is
 * legitimately off the map at 13.95 — the readout would be naming a level the
 * map is not at yet.
 *
 * Truncating in floating point needs the product settled first: 12.3 * 10 is
 * 122.99999999999999, which floors to 12.2. The allowance is one ulp of the
 * product, so it covers that error and nothing a view can be at: rounding to a
 * fixed number of decimals instead would lift a zoom genuinely below a tenth
 * over it, which is the reporting this function exists to stop.
 */
export function truncateZoomToDisplay(zoom: number): number {
  const steps = zoom * ZOOM_DISPLAY_STEPS;
  const settled = steps + Number.EPSILON * Math.max(1, Math.abs(steps));
  return Math.floor(settled) / ZOOM_DISPLAY_STEPS;
}

/** Zoom level for the map readout, always carrying its one decimal. */
export function zoomDisplayText(zoom: number): string {
  return truncateZoomToDisplay(zoom).toFixed(1);
}
