import { describe, it, expect } from 'vitest';
import { ResourcePopoverComponent } from './resource-popover.component';

// A minimal route stub — just the fields parseRoute() reads. Built inline
// rather than importing SKRoute, to avoid pulling a second deep module path
// into the test graph (which perturbs barrel-import evaluation order and can
// break the AppComponent bootstrap spec).
const routeStub = () => ({
  name: '',
  description: '',
  distance: 0,
  feature: { properties: {} }
});

/**
 * Info button visibility for the route popover (#533). Clicking INFO on an
 * unsaved route draft fetched the route from the server, which 404s (the draft
 * is not stored yet), surfacing an error. An unsaved draft must therefore not
 * offer INFO — the SAVE shortcut already opens the details dialog for editing
 * its title/description.
 *
 * `computeControls()` (the constructor effect body) only reads plain instance
 * fields and the signal inputs, so exercise it on a bare prototype instance
 * with the inputs stubbed as plain getters (same approach as
 * ais-base.component.spec).
 */
const appStub = {
  formatValueForDisplay: (v: number) => `${v} m`,
  useInfoPanel: () => false
};

function popover(canSave: boolean) {
  const c = Object.create(
    ResourcePopoverComponent.prototype
  ) as ResourcePopoverComponent;
  Object.assign(c, {
    resource: () => ['route-1', routeStub()],
    type: () => 'route',
    active: () => undefined,
    featureCount: () => 2,
    canSave: () => canSave,
    app: appStub,
    _title: { set: () => undefined },
    hasMarkdown: { set: () => undefined },
    ctrl: {
      showInfoButton: false,
      showModifyButton: false,
      showDeleteButton: false,
      showAddNoteButton: false,
      showRelatedButton: false,
      showPointsButton: false,
      showNotesButton: false,
      showSaveButton: false,
      canActivate: false,
      isActive: false,
      activeText: 'ACTIVE',
      isReadOnly: false,
      modifyLabel: 'MOVE'
    }
  });
  (c as unknown as { computeControls: () => void }).computeControls();
  return c as unknown as {
    ctrl: { showInfoButton: boolean; showSaveButton: boolean };
  };
}

describe('ResourcePopoverComponent — route Info visibility (#533)', () => {
  it('shows INFO for a saved route', () => {
    const c = popover(false);
    expect(c.ctrl.showSaveButton).toBe(false);
    expect(c.ctrl.showInfoButton).toBe(true);
  });

  it('hides INFO for an unsaved route draft (offers SAVE instead)', () => {
    const c = popover(true);
    expect(c.ctrl.showSaveButton).toBe(true);
    expect(c.ctrl.showInfoButton).toBe(false);
  });
});
