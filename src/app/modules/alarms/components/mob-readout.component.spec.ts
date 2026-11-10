import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppFacade } from 'src/app/app.facade';
import { CourseService } from '../../course';
import { MobService } from '../mob.service';
import { AlertData } from './alert.component';
import { MobReadoutComponent } from './mob-readout.component';

interface Self {
  positionReceived: boolean;
  position?: [number, number];
}

function mount(
  alert: Partial<AlertData>,
  self: Self = { positionReceived: false },
  mob: { playback?: boolean } = {}
): ComponentFixture<MobReadoutComponent> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AppFacade,
        useValue: {
          data: { vessels: { self } },
          formatValueForDisplay: (v: number, unit: string) =>
            `${Math.round(v * 1000) / 1000}${unit}`
        }
      },
      {
        provide: CourseService,
        useValue: { courseData: signal({ position: null }) }
      },
      { provide: MobService, useValue: mob }
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

  it('says a MOB kept on this display is not on the others', () => {
    expect(text(mount({ local: true }))).toContain('Only on this display');
    TestBed.resetTestingModule();
    expect(text(mount({}))).not.toContain('Only on this display');
  });

  it('ignores a position without a latitude', () => {
    const f = mount({
      properties: { position: { longitude: 178.4 } }
    } as unknown as Partial<AlertData>);
    expect(text(f)).toContain('No MOB position reported');
    expect(buttons(f)).toEqual(['close END MOB']);
  });

  describe('bearing and distance', () => {
    const at = {
      properties: { position: { latitude: 0, longitude: 0 } }
    } as Partial<AlertData>;
    afterEach(() => vi.useRealTimers());

    it('follow the vessel from one tick to the next', () => {
      vi.useFakeTimers();
      const self: Self = { positionReceived: true, position: [0, -0.01] };
      const f = mount(at, self);
      // due north, about 1112 m
      expect(text(f)).toMatch(/0rad T\s+111\d(\.\d+)?m/);

      self.position = [-0.01, 0];
      vi.advanceTimersByTime(1000);
      f.detectChanges();
      // due east
      expect(text(f)).toMatch(/1\.571rad T/);
    });

    it('are left out in playback', () => {
      const f = mount(
        at,
        { positionReceived: true, position: [0, -0.01] },
        { playback: true }
      );
      expect(text(f)).not.toContain('rad');
    });
  });
});
