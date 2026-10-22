import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getDistance } from 'geolib';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { SimpleChange } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnchorWatchComponent } from './anchor-watch.component';
import { AnchorService } from '../anchor.service';
import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';

/**
 * The default alarm radius is kept in the config. Dropping the anchor, or
 * setting the radius from the rode let out, without a radius of its own leaves
 * the server to measure one, and must not wipe the saved default.
 */
describe('AnchorWatchComponent default alarm radius', () => {
  let saveConfig: ReturnType<typeof vi.fn>;
  let anchor: {
    drop: ReturnType<typeof vi.fn>;
    setRadius: ReturnType<typeof vi.fn>;
    setRaisedSignal: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    saveConfig = vi.fn();
    anchor = {
      drop: vi.fn(() => of(undefined)),
      setRadius: vi.fn(() => of(undefined)),
      setRaisedSignal: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: { anchor: { radius: 40 }, units: { length: 'm' } },
            saveConfig,
            parseHttpErrorResponse: vi.fn()
          }
        },
        { provide: AnchorService, useValue: anchor }
      ]
    });
    TestBed.overrideComponent(AnchorWatchComponent, { set: { template: '' } });
  });

  const create = (raised: boolean) => {
    const component =
      TestBed.createComponent(AnchorWatchComponent).componentInstance;
    component.raised = raised;
    return component;
  };

  const app = () => TestBed.inject(AppFacade);

  it('keeps the saved radius when the anchor is dropped without one', () => {
    const component = create(true);

    component.dropRaiseAnchor({ checked: true } as MatSlideToggleChange);

    expect(anchor.drop).toHaveBeenCalledWith(undefined);
    expect(app().config.anchor.radius).toBe(40);
  });

  it('keeps the saved radius when the radius is set from the rode', () => {
    const component = create(false);

    component.stepSetRode();

    expect(anchor.setRadius).toHaveBeenCalledWith(undefined);
    expect(saveConfig).toHaveBeenCalled();
    expect(app().config.anchor.radius).toBe(40);
    expect(component['displayRadius']()).toBe('--');
  });

  it('saves a default radius typed into the field', () => {
    const component = create(true);

    component.onDefaultRadiusChange(25);

    expect(app().config.anchor.radius).toBe(25);
  });

  it('keeps the saved radius while the field is empty or below 1', () => {
    const component = create(true);

    for (const value of [null, 0, -5, 0.4, 0.5]) {
      component.onDefaultRadiusChange(value);
      expect(app().config.anchor.radius).toBe(40);
    }
  });

  it('saves a default radius typed in feet in metres', () => {
    const component = create(true);
    app().config.units.length = 'foot';

    component.onDefaultRadiusChange(100);

    expect(app().config.anchor.radius).toBe(30);
  });

  it('saves a 1 ft default radius as 1 m rather than dropping it', () => {
    const component = create(true);
    app().config.units.length = 'foot';

    component.onDefaultRadiusChange(1);

    expect(app().config.anchor.radius).toBe(1);
  });

  it('saves a radius that is set', () => {
    const component = create(false);

    component.setRadius(55);

    expect(app().config.anchor.radius).toBe(55);
    expect(component['displayRadius']()).toBe('55 m');
  });

  const reportRadius = (
    component: AnchorWatchComponent,
    radius: number,
    previous = -1
  ) => {
    component.radius = radius;
    component.ngOnChanges({
      radius: new SimpleChange(previous, radius, false)
    });
  };

  it('steps the alarm radius from the one the server reports', () => {
    const component = create(false);
    reportRadius(component, 32);

    component.stepRadius(10);
    component.stepRadius(-1);

    expect(anchor.setRadius).toHaveBeenNthCalledWith(1, 42);
    expect(anchor.setRadius).toHaveBeenNthCalledWith(2, 41);
    expect(app().config.anchor.radius).toBe(41);
    expect(component['displayRadius']()).toBe('41 m');
  });

  it('steps from the saved radius while the server reports none', () => {
    const component = create(false);
    reportRadius(component, -1, 0);

    component.stepRadius(1);

    expect(anchor.setRadius).toHaveBeenCalledWith(41);
  });

  it('does not step the radius below the minimum', () => {
    const component = create(false);
    reportRadius(component, 8);

    component.stepRadius(-10);

    expect(anchor.setRadius).toHaveBeenCalledWith(5);
  });

  it('sends nothing for a step at the minimum', () => {
    const component = create(false);
    reportRadius(component, 5);

    component.stepRadius(-1);

    expect(anchor.setRadius).not.toHaveBeenCalled();
  });

  it('does not raise a radius below the minimum with a step down', () => {
    const component = create(false);
    app().config.anchor.radius = 1;
    reportRadius(component, -1, 0);

    component.stepRadius(-1);

    expect(anchor.setRadius).not.toHaveBeenCalled();
  });

  it('shows the saved radius it steps from while the server reports none', () => {
    const component = create(false);

    reportRadius(component, -1, 0);

    expect(component['displayRadius']()).toBe('40 m');
  });

  it('steps the radius in feet when lengths show in feet', () => {
    const component = create(false);
    app().config.units.length = 'foot';
    reportRadius(component, 30.48);

    component.stepRadius(10);

    expect(anchor.setRadius.mock.calls[0][0]).toBeCloseTo(33.528);
    expect(component['displayRadius']()).toBe('110 ft');
  });

  it('keeps stepping from its own radius when the server reports late', () => {
    const component = create(false);
    reportRadius(component, 30);

    component.stepRadius(1);
    component.stepRadius(1);
    reportRadius(component, 30, 30);
    reportRadius(component, 31, 30);
    component.stepRadius(1);

    expect(anchor.setRadius).toHaveBeenLastCalledWith(33);
  });

  it('shows the radius it steps from, not a late report', () => {
    const component = create(false);
    reportRadius(component, 30);

    component.stepRadius(1);
    component.stepRadius(1);
    reportRadius(component, 31, 30);

    expect(component['displayRadius']()).toBe('32 m');
  });

  it('goes on from the reported radius when a step is refused', () => {
    const component = create(false);
    reportRadius(component, 30);
    anchor.setRadius.mockReturnValueOnce(throwError(() => new Error('no')));

    component.stepRadius(10);

    expect(component['displayRadius']()).toBe('30 m');
    component.stepRadius(1);
    expect(anchor.setRadius).toHaveBeenLastCalledWith(31);
  });

  it('sends one radius at a time and adds up the steps between', () => {
    const response = new Subject<void>();
    anchor.setRadius.mockReturnValue(response);
    const component = create(false);
    reportRadius(component, 30);

    component.stepRadius(1);
    component.stepRadius(1);
    component.stepRadius(10);
    expect(anchor.setRadius).toHaveBeenCalledTimes(1);

    response.next();
    expect(anchor.setRadius).toHaveBeenCalledTimes(2);
    expect(anchor.setRadius).toHaveBeenLastCalledWith(42);
    expect(component['displayRadius']()).toBe('42 m');
  });

  it('takes up a radius set elsewhere after stepping back and forth', () => {
    const component = create(false);
    reportRadius(component, 30);
    component.stepRadius(1);
    component.stepRadius(-1);
    reportRadius(component, 31, 30);
    reportRadius(component, 30, 31);

    reportRadius(component, 31, 30);
    component.stepRadius(1);

    expect(anchor.setRadius).toHaveBeenLastCalledWith(32);
  });

  it('takes up a radius set elsewhere', () => {
    const component = create(false);
    reportRadius(component, 30);
    component.stepRadius(1);
    reportRadius(component, 31, 30);

    reportRadius(component, 25, 31);
    component.stepRadius(1);

    expect(anchor.setRadius).toHaveBeenLastCalledWith(26);
  });
});

describe('AnchorWatchComponent shift anchor', () => {
  let position: WritableSignal<Position | null>;
  let pending: { resolve: () => void; reject: (e: unknown) => void }[];
  let setAnchorPosition: ReturnType<typeof vi.fn>;
  let parseHttpErrorResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    position = signal<Position | null>([0, 0]);
    pending = [];
    setAnchorPosition = vi.fn(
      () =>
        new Promise<boolean>((resolve, reject) =>
          pending.push({ resolve: () => resolve(true), reject })
        )
    );
    parseHttpErrorResponse = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: { anchor: { radius: 40 }, units: { length: 'm' } },
            parseHttpErrorResponse
          }
        },
        {
          provide: AnchorService,
          useValue: { position, setAnchorPosition }
        }
      ]
    });
    TestBed.overrideComponent(AnchorWatchComponent, { set: { template: '' } });
  });

  const create = () => {
    const fixture = TestBed.createComponent(AnchorWatchComponent);
    TestBed.tick();
    return fixture.componentInstance;
  };

  /** Answer the request in flight and let its follow-up go out. */
  const answer = async () => {
    pending.shift()?.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  const sent = (call: number): Position =>
    setAnchorPosition.mock.calls[call][0] as Position;

  it('sends one position at a time and adds up the steps between', async () => {
    const component = create();

    component.shiftAnchor(0);
    component.shiftAnchor(0);
    component.shiftAnchor(0);
    expect(setAnchorPosition).toHaveBeenCalledTimes(1);

    await answer();
    expect(setAnchorPosition).toHaveBeenCalledTimes(2);
    expect(getDistance(sent(0), [0, 0])).toBe(1);
    expect(getDistance(sent(1), [0, 0])).toBe(3);

    await answer();
    expect(setAnchorPosition).toHaveBeenCalledTimes(2);
  });

  it('ignores a lagging server position while a step is unanswered', async () => {
    const component = create();

    component.shiftAnchor(90);
    position.set([0, 0]);
    TestBed.tick();
    component.shiftAnchor(90);
    await answer();

    expect(getDistance(sent(1), [0, 0])).toBe(2);
  });

  it('ignores a lagging server position after the step is answered', async () => {
    const component = create();

    component.shiftAnchor(0);
    await answer();
    position.set([0, 0]);
    TestBed.tick();
    component.shiftAnchor(0);

    expect(getDistance(sent(1), [0, 0])).toBe(2);
  });

  it('shifts from a position the anchor was moved to elsewhere', async () => {
    const component = create();

    component.shiftAnchor(90);
    await answer();
    position.set([1, 1]);
    TestBed.tick();
    component.shiftAnchor(90);

    expect(getDistance(sent(1), [1, 1])).toBe(1);
  });

  it('drops the queued steps when a request fails', async () => {
    const component = create();

    component.shiftAnchor(0);
    component.shiftAnchor(0);
    pending.shift()?.reject(new Error('down'));
    await Promise.resolve();
    await Promise.resolve();

    expect(parseHttpErrorResponse).toHaveBeenCalled();
    expect(setAnchorPosition).toHaveBeenCalledTimes(1);
  });
});
