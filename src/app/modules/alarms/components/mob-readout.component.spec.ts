import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { CourseService } from '../../course';
import { MobService } from '../mob.service';
import { AlertData } from './alert.component';
import { MobReadoutComponent } from './mob-readout.component';

function mount(
  alert: Partial<AlertData>
): ComponentFixture<MobReadoutComponent> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AppFacade,
        useValue: {
          data: { vessels: { self: { positionReceived: false } } },
          formatValueForDisplay: () => ''
        }
      },
      {
        provide: CourseService,
        useValue: { courseData: signal({ position: null }) }
      },
      { provide: MobService, useValue: {} }
    ]
  });
  const fixture = TestBed.createComponent(MobReadoutComponent);
  fixture.componentRef.setInput('alert', {
    id: 'm1',
    createdAt: Date.now(),
    canCancel: true,
    properties: {},
    ...alert
  } as AlertData);
  fixture.detectChanges();
  return fixture;
}

const text = (f: ComponentFixture<MobReadoutComponent>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

const buttons = (f: ComponentFixture<MobReadoutComponent>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).map(
    (b) => b.textContent?.trim()
  );

describe('MobReadoutComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('says why there is no ZOOM or DIRECT-TO without a MOB position', () => {
    const f = mount({});
    expect(text(f)).toContain('No MOB position reported');
    expect(buttons(f)).toEqual(['close END MOB']);
  });

  it('offers ZOOM and DIRECT-TO with a position', () => {
    const f = mount({
      properties: { position: { latitude: -18.1, longitude: 178.4 } }
    } as Partial<AlertData>);
    expect(buttons(f)).toEqual([
      'zoom_in ZOOM',
      'near_me DIRECT-TO',
      'close END MOB'
    ]);
    expect(text(f)).not.toContain('No MOB position');
  });
});
