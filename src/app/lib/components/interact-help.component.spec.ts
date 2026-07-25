import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InteractionHelpComponent } from './interact-help.component';
import { FBMapInteractService } from '../../modules/map/fbmap-interact.service';
import { AppFacade } from '../../app.facade';

/**
 * Route drawing and modifying share one docked popover card (issue #545). These
 * exercise the constructor decision logic that selects that card, its title, and
 * when Finish is allowed — without rendering the template (keeps the test off the
 * barrel-cycle path that flakes full-render component specs).
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
});
