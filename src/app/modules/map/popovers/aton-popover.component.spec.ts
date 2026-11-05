import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AtoNPopoverComponent } from './aton-popover.component';
import { AppFacade } from 'src/app/app.facade';
import { SKAtoN, SKSensorTarget } from 'src/app/modules';

/** The popover title names what was tapped, also when it has no name. */
describe('AtoNPopoverComponent — title', () => {
  const titleOf = (item: SKAtoN | SKSensorTarget) => {
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
    fixture.componentRef.setInput('aton', item);
    fixture.detectChanges();
    return fixture.componentInstance._title;
  };

  it('names an unnamed sensor target by its type', () => {
    const t = new SKSensorTarget();
    t.id = 'targets.radar:nav1-17';
    t.type = { id: -1, name: 'Radar target' };
    expect(titleOf(t)).toBe('Radar target');
  });

  it('keeps the AtoN default for an unnamed AtoN', () => {
    const a = new SKAtoN();
    a.id = 'atons.urn:mrn:imo:mmsi:992446000';
    a.type = { id: 21, name: 'Beacon, Cardinal N' };
    expect(titleOf(a)).toBe('AtoN:');
  });
});
