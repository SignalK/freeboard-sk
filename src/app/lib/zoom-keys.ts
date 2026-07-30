/**
 * The zoom step a keydown requests — `'in'` for `+`, `'out'` for `-`, or `null`
 * for anything else. Mirrors OpenLayers' KeyboardZoom key set (`+` / `-`) so
 * routing these keys through the app's own zoom leaves *which* keys zoom
 * unchanged. A platform-modifier chord (Ctrl/Cmd/Alt) is left alone so the
 * browser's own page zoom still wins, as is a text-editing target so typing `-`
 * in a field doesn't move the map.
 */
export function zoomKeyDirection(e: KeyboardEvent): 'in' | 'out' | null {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return null;
  }
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    !!el?.isContentEditable
  ) {
    return null;
  }
  if (e.key === '+') {
    return 'in';
  }
  if (e.key === '-') {
    return 'out';
  }
  return null;
}
