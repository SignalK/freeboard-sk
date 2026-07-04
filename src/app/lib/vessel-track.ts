/**
 * Helpers for the session-only set of AIS vessels whose track is displayed
 * individually (independent of the global `aisShowTrack` "show all tracks" setting).
 *
 * The set is a plain `string[]` of vessel ids. Toggle helpers return a NEW array
 * so that Angular's OnPush change detection sees an input reference change.
 */

/** True when the vessel id is in the display-track selection. */
export function isTrackShown(selected: string[], id: string): boolean {
  return Array.isArray(selected) && selected.includes(id);
}

/**
 * Add the id if absent, remove it if present. Always returns a new array
 * (never mutates the input) so bound inputs re-fire change detection.
 */
export function toggleTrackSelection(selected: string[], id: string): string[] {
  const current = Array.isArray(selected) ? selected : [];
  return current.includes(id)
    ? current.filter((v) => v !== id)
    : [id, ...current];
}

/**
 * Whether a vessel's track should be rendered: always when "show all" is on,
 * otherwise only when the vessel is in the individual selection.
 */
export function shouldRenderTrack(
  id: string,
  showAll: boolean,
  selected: string[]
): boolean {
  return showAll || isTrackShown(selected, id);
}
