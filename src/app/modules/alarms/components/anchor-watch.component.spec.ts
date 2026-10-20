import { TestBed } from '@angular/core/testing';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnchorWatchComponent } from './anchor-watch.component';
import { AnchorService } from '../anchor.service';
import { AppFacade } from 'src/app/app.facade';

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
            saveConfig
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

  it('saves a radius that is set', () => {
    const component = create(false);

    component.setRadius(55);

    expect(app().config.anchor.radius).toBe(55);
    expect(component['displayRadius']()).toBe('55 m');
  });
});
