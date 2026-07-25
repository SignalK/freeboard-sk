/**
 * True when a keydown is the "undo" shortcut — Ctrl-Z / Cmd-Z, without Shift so
 * it doesn't collide with the common redo chord — and is not aimed at a
 * text-editing target, where the browser's own undo should win. The key match
 * is case-insensitive so the shortcut still fires with CapsLock on (`e.key`
 * would otherwise be `'Z'`).
 */
export function isUndoKeyEvent(e: KeyboardEvent): boolean {
  const isUndo =
    (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
  if (!isUndo) {
    return false;
  }
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName;
  return !(
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    !!el?.isContentEditable
  );
}
