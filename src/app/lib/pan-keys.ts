import { isTextEditingTarget } from './zoom-keys';

/**
 * Whether a keydown is one OpenLayers' KeyboardPan interaction will act on —
 * a bare arrow key, so the app can apply its own pan behaviour alongside the
 * pan OL performs. Mirrors KeyboardPan's default condition exactly
 * (`noModifierKeys` + `targetNotEditable`): a chord with ANY modifier, Shift
 * included, does not pan the map, so it must not count as a pan either.
 */
export function isPanKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return false;
  }
  if (isTextEditingTarget(e)) {
    return false;
  }
  return (
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight'
  );
}
