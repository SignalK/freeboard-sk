import { describe, it, expect } from 'vitest';
import { ResourcePopoverComponent } from './resource-popover.component';

// A minimal route stub — just the fields parseRoute() reads. Built inline
// rather than importing SKRoute, to avoid pulling a second deep module path
// into the test graph (which perturbs barrel-import evaluation order and can
// break the AppComponent bootstrap spec).
const routeStub = (readOnly = false) => ({
  name: '',
  description: '',
  distance: 0,
  feature: { properties: { readOnly } }
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

function popover(canSave: boolean, readOnly = false, active?: string) {
  const c = Object.create(
    ResourcePopoverComponent.prototype
  ) as ResourcePopoverComponent;
  Object.assign(c, {
    resource: () => ['route-1', routeStub(readOnly)],
    type: () => 'route',
    active: () => active,
    featureCount: () => 2,
    canSave: () => canSave,
    app: appStub,
    _title: { set: () => undefined },
    hasMarkdown: { set: () => undefined },
    ctrl: {
      showInfoButton: false,
      showModifyButton: false,
      showDeleteButton: false,
      showHideButton: false,
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
    ctrl: {
      showInfoButton: boolean;
      showSaveButton: boolean;
      showHideButton: boolean;
      showPointsButton: boolean;
      isActive: boolean;
    };
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

/**
 * Hide action for the route popover (#551). Hide removes a route from the
 * displayed set (a shortcut for the Routes-list "Show on Map" toggle) without
 * deleting the resource. It is offered for a saved route but not for an unsaved
 * draft — a draft isn't in the Routes list, so hiding it would leave no way to
 * bring it back (Delete/discard is offered there instead).
 */
describe('ResourcePopoverComponent — route Hide visibility (#551)', () => {
  it('offers HIDE for a saved route', () => {
    const c = popover(false);
    expect(c.ctrl.showHideButton).toBe(true);
  });

  it('does not offer HIDE for an unsaved route draft', () => {
    const c = popover(true);
    expect(c.ctrl.showSaveButton).toBe(true);
    expect(c.ctrl.showHideButton).toBe(false);
  });

  it('offers HIDE for a read-only route (non-destructive display toggle)', () => {
    const c = popover(false, true) as unknown as {
      ctrl: { showHideButton: boolean; showDeleteButton: boolean };
    };
    // Read-only suppresses DELETE but not HIDE — hiding never touches the resource.
    expect(c.ctrl.showDeleteButton).toBe(false);
    expect(c.ctrl.showHideButton).toBe(true);
  });

  it('keeps HIDE present but disabled while the route is active', () => {
    const c = popover(false, false, 'route-1');
    // HIDE stays visible; the template disables it via `[disabled]="ctrl.isActive"`
    // so the route being navigated cannot be hidden out from under navigation.
    expect(c.ctrl.showHideButton).toBe(true);
    expect(c.ctrl.isActive).toBe(true);
  });
});

/**
 * Route Points visibility (#583). The Points action reorders a route's
 * waypoints. It was hidden for an unsaved draft because its dialog operated
 * against the server; the dialog now edits the route buffer, so a draft's
 * points are reorderable too and the button is shown.
 */
describe('ResourcePopoverComponent — route Points visibility (#583)', () => {
  it('shows POINTS for a saved route', () => {
    const c = popover(false);
    expect(c.ctrl.showPointsButton).toBe(true);
  });

  it('shows POINTS for an unsaved route draft (dialog edits the buffer)', () => {
    const c = popover(true);
    expect(c.ctrl.showSaveButton).toBe(true);
    expect(c.ctrl.showPointsButton).toBe(true);
  });
});
