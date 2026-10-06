import { PipAppDef } from './types';

/**
 * Test helpers shared by the PiP App specs. No test-runner imports here, so
 * the file compiles under the app tsconfig; it is only ever imported by specs.
 */

/** A well-formed window definition, with any field overridden. */
export function pipAppDef(overrides: Partial<PipAppDef> = {}): PipAppDef {
  return {
    id: 'w1',
    title: 'Sounder',
    source: { kind: 'webapp', path: '/signalk-wifish/' },
    rect: { x: 0.1, y: 0.1, w: 0.4, h: 0.5 },
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
