import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AtoNPopoverComponent } from './aton-popover.component';
import { AppFacade } from 'src/app/app.facade';
import { SKAtoN } from 'src/app/modules';

const target = (id: string) => {
  const t = new SKAtoN();
  t.id = id;
  t.name = id;
  t.position = [178.4, -18.1];
  t.lastUpdated = new Date();
  return t;
};

/** A radar target's popover offers to stop tracking it; nothing else does. */
describe('AtoNPopoverComponent — stop tracking', () => {
  const render = (id: string) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: { units: { positionFormat: 'XY' } },
            formatValueForDisplay: (v: number, unit: string) => `${v} ${unit}`
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(AtoNPopoverComponent);
    fixture.componentRef.setInput('aton', target(id));
    fixture.detectChanges();
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((b) => b.textContent?.includes('STOP TRACKING'));
    return { fixture, button };
  };

  it('emits untrack from a radar target', () => {
    const { fixture, button } = render('targets.radar:fur6424A-3');
    let untracked = 0;
    fixture.componentInstance.untrack.subscribe(() => untracked++);
    button?.click();
    expect(untracked).toBe(1);
  });

  it('has no stop button on a camera target or an AtoN', () => {
    expect(render('targets.camera:bow-7').button).toBeUndefined();
    TestBed.resetTestingModule();
    expect(render('atons.urn:mrn:imo:mmsi:993456789').button).toBeUndefined();
  });
});
