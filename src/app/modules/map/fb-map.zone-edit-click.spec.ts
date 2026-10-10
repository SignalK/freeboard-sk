import { describe, expect, it, vi } from 'vitest';

import { FBMapComponent } from './fb-map.component';

// A bare prototype instance, as in fb-map.pointer-down.spec.ts: the handler
// reads a few services, and a TestBed fixture would import the whole map.
const bareComponent = (editing: boolean) => {
  const cmp = Object.create(FBMapComponent.prototype);
  cmp.app = {
    data: { map: {} },
    config: { map: { popoverMulti: false } }
  };
  cmp.mapInteract = {
    isMeasuring: () => false,
    isDrawing: () => false,
    isModifying: () => false
  };
  cmp.zoneEdit = {
    edit: () =>
      editing ? { controlId: 'guardZone1', mode: 'draw' } : undefined
  };
  cmp.overlay = { update: vi.fn() };
  cmp.processMapClick = vi.fn();
  cmp.pinCursorAtTap = vi.fn();
  return cmp;
};

const tap = { features: [], lonlat: [5, 52], worldOffset: 0 };

describe('FBMapComponent.onMapSingleClick during a guard zone edit', () => {
  it('opens no popover for a tap on the chart being drawn on', () => {
    const cmp = bareComponent(true);
    cmp.onMapSingleClick(tap);
    expect(cmp.processMapClick).not.toHaveBeenCalled();
    expect(cmp.overlay.update).not.toHaveBeenCalled();
  });

  it('handles a tap as usual otherwise', () => {
    const cmp = bareComponent(false);
    cmp.onMapSingleClick(tap);
    expect(cmp.processMapClick).toHaveBeenCalledWith(tap);
  });
});
