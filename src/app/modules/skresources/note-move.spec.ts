import { describe, it, expect, vi } from 'vitest';
import { Collection, Feature } from 'ol';
import { SKResourceService } from './resources.service';

/**
 * Regression test for #501 — the "Move" action on the Note details surfaces
 * must start the map Modify interaction on the *actual rendered note feature*
 * that the opening map click loaded into the draw collection. Modifying that
 * feature (not a reconstructed copy) is what visually moves the icon and yields
 * the coordinates the save persists. When no such feature is present (details
 * reached without a map click), Move is a no-op.
 *
 * It only touches `this.mapInteract`, so exercise it on a bare prototype
 * instance — no Angular DI (same approach as note-details-sizing.spec.ts).
 */
type FakeMapInteract = {
  draw: { features: Collection<Feature> };
  startModifying: ReturnType<typeof vi.fn>;
};

function noteFeature(id: string): Feature {
  const f = new Feature();
  f.setId(id);
  return f;
}

function svc(mapInteract: FakeMapInteract) {
  const s = Object.create(SKResourceService.prototype) as SKResourceService;
  Object.assign(s as unknown as Record<string, unknown>, { mapInteract });
  return s;
}

describe('startNoteModify (#501)', () => {
  it('modifies the note feature loaded by the map click', () => {
    const feature = noteFeature('note.note-1');
    const mapInteract: FakeMapInteract = {
      draw: { features: new Collection([feature]) },
      startModifying: vi.fn()
    };

    svc(mapInteract).startNoteModify('note-1');

    expect(mapInteract.startModifying).toHaveBeenCalledWith({ type: 'note' });
    // the same rendered feature object is what gets modified
    expect(mapInteract.draw.features.item(0)).toBe(feature);
  });

  it('restricts the interaction to the target note feature', () => {
    const target = noteFeature('note.note-1');
    const mapInteract: FakeMapInteract = {
      draw: { features: new Collection([target, noteFeature('note.note-2')]) },
      startModifying: vi.fn()
    };

    svc(mapInteract).startNoteModify('note-1');

    expect(mapInteract.draw.features.getLength()).toBe(1);
    expect(mapInteract.draw.features.item(0)).toBe(target);
  });

  it('does nothing when the target note feature is not loaded', () => {
    const mapInteract: FakeMapInteract = {
      draw: { features: new Collection([noteFeature('route.r-1')]) },
      startModifying: vi.fn()
    };

    svc(mapInteract).startNoteModify('note-1');

    expect(mapInteract.startModifying).not.toHaveBeenCalled();
  });

  it('does nothing when no feature is loaded (no map click)', () => {
    const mapInteract: FakeMapInteract = {
      draw: { features: new Collection([]) },
      startModifying: vi.fn()
    };

    svc(mapInteract).startNoteModify('note-1');

    expect(mapInteract.startModifying).not.toHaveBeenCalled();
  });
});
