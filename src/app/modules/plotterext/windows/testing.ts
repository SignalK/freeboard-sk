import { ExtWindow } from './types';

/**
 * Test helpers shared by the window specs. No test-runner imports here, so
 * the file compiles under the app tsconfig; it is only ever imported by specs.
 */

/**
 * A well-formed window, with any field overridden. In a 1000x800 window area
 * it sits at (100, 80) and is 400x400.
 */
export function extWindow(overrides: Partial<ExtWindow> = {}): ExtWindow {
  return {
    id: 'w1',
    extension: 'ext-a',
    panel: {
      id: 'viewer',
      title: 'Viewer',
      type: 'iframe',
      url: '/plotterext/ext-a/viewer.html'
    },
    params: {},
    title: 'Sounder',
    geometry: {
      anchor: 'top-left',
      offset: { x: 100, y: 80 },
      width: 400,
      height: 400
    },
    modal: false,
    resizable: true,
    movable: true,
    titleBar: 'autoHide',
    userClose: 'close',
    visible: true,
    collapsed: false,
    opacity: 1,
    ...overrides
  };
}

export interface PointerEventInit {
  x?: number;
  y?: number;
  pointerType?: 'mouse' | 'touch' | 'pen';
  isPrimary?: boolean;
  button?: number;
  pointerId?: number;
}

/**
 * A pointer event jsdom can dispatch: it has no PointerEvent constructor, so
 * one is built from a MouseEvent with the pointer fields defined on top.
 */
export function pointerEvent(
  type: string,
  init: PointerEventInit = {}
): PointerEvent {
  const e = new MouseEvent(type, {
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    bubbles: true,
    cancelable: true,
    button: init.button ?? 0
  });
  Object.defineProperty(e, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(e, 'pointerType', {
    value: init.pointerType ?? 'mouse'
  });
  Object.defineProperty(e, 'isPrimary', { value: init.isPrimary ?? true });
  return e as unknown as PointerEvent;
}
