import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InteractionHelpComponent } from './interact-help.component';
import { FBMapInteractService } from '../../modules/map/fbmap-interact.service';
import { AppFacade } from '../../app.facade';

/**
 * Route drawing and modifying share one docked popover card (issue #545). These
 * exercise the constructor decision logic that selects that card, its title, and
 * when Finish is allowed — without rendering the template, which the logic under
 * test does not need.
 */
describe('InteractionHelpComponent — unified route helper', () => {
  let svc: FBMapInteractService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: { debug: () => undefined, formatValueForDisplay: () => '' }
        }
      ]
    });
    svc = TestBed.inject(FBMapInteractService);
  });

  const create = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TestBed.runInInjectionContext(() => new InteractionHelpComponent()) as any;

  it('renders the "Draw New Route" card while drawing a route', () => {
    svc.draw.resourceType = 'route';
    svc.isDrawing.set(true);
    const c = create();
    expect(c.isRouteEditing()).toBe(true);
    expect(c.mode.iconText).toBe('Draw New Route');
  });

  it('gates Finish on ≥2 drawn points while drawing', () => {
    svc.draw.resourceType = 'route';
    svc.isDrawing.set(true);
    svc.measurementCoords = [[0, 0]];
    const c = create();
    expect(c.canFinish()).toBe(false);

    svc.measurementCoords = [
      [0, 0],
      [1, 1]
    ];
    expect(c.canFinish()).toBe(true);
  });

  it('renders the "Modify Route" card with Finish always enabled', () => {
    svc.draw.resourceType = 'route';
    svc.isModifying.set(true);
    const c = create();
    expect(c.isRouteEditing()).toBe(true);
    expect(c.mode.iconText).toBe('Modify Route');
    expect(c.canFinish()).toBe(true);
  });

  it('titles the modify card with the route name when known', () => {
    svc.draw.resourceType = 'route';
    svc.draw.name = 'Passage to Marathon';
    svc.isModifying.set(true);
    const c = create();
    expect(c.mode.iconText).toBe('Modify Passage to Marathon');
  });

  it('leaves non-route interactions on the legacy panel', () => {
    svc.draw.resourceType = 'waypoint';
    svc.draw.forSave = { id: null, coords: null };
    svc.isModifying.set(true);
    const c = create();
    expect(c.isRouteEditing()).toBe(false);
  });

  it('emits finish and cancel from the card actions', () => {
    svc.draw.resourceType = 'route';
    svc.isDrawing.set(true);
    const c = create();
    let finished = false;
    let cancelled = false;
    c.finish.subscribe(() => (finished = true));
    c.cancel.subscribe(() => (cancelled = true));
    c.finishEditing();
    c.close();
    expect(finished).toBe(true);
    expect(cancelled).toBe(true);
  });

  it('emits undo from the card Undo action (#542)', () => {
    svc.draw.resourceType = 'route';
    svc.isModifying.set(true);
    const c = create();
    let undone = false;
    c.undo.subscribe(() => (undone = true));
    c.undoLast();
    expect(undone).toBe(true);
  });
});

/**
 * The route-editing undo stack lives on the interaction service (issue #542) so
 * the docked card's Undo button and Ctrl/Cmd-Z share one source of truth. These
 * cover the `canUndo` signal across draw and modify, and that starting an
 * interaction clears any prior history.
 */
describe('FBMapInteractService — route editing undo', () => {
  let svc: FBMapInteractService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            debug: () => undefined,
            uiCtrl: { update: () => undefined }
          }
        }
      ]
    });
    svc = TestBed.inject(FBMapInteractService);
  });

  it('offers undo while drawing once a point is placed', () => {
    svc.isDrawing.set(true);
    expect(svc.canUndo()).toBe(false);
    svc.measurementCoords = [[0, 0]];
    expect(svc.canUndo()).toBe(true);
    svc.measurementCoords = [];
    expect(svc.canUndo()).toBe(false);
  });

  it('offers undo while modifying once an operation is stacked', () => {
    svc.isModifying.set(true);
    expect(svc.canUndo()).toBe(false);
    svc.pushModifyUndo({ coordinates: [[0, 0]] });
    expect(svc.canUndo()).toBe(true);
    const snap = svc.popModifyUndo();
    expect(snap?.coordinates).toEqual([[0, 0]]);
    expect(svc.canUndo()).toBe(false);
  });

  it('clears the modify undo history when a new interaction starts', () => {
    svc.isModifying.set(true);
    svc.pushModifyUndo({ coordinates: [[0, 0]] });
    expect(svc.canUndo()).toBe(true);

    svc.startDrawing('route');
    expect(svc.popModifyUndo()).toBeUndefined();
    expect(svc.canUndo()).toBe(false);
  });
});
