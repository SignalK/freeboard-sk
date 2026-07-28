import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { beforeEach, describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';

import { CourseSettingsModal } from './course-settings';
import { CourseService } from './course.service';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { DistanceUnitDef } from 'src/app/types';

/**
 * Harness for the Arrival Circle field's unit conversion (#639). arrivalCircle
 * is always stored/streamed in meters (SignalK spec); the dialog must convert
 * to/from the user's Distance preference on both the display path (ngOnInit)
 * and the save path (onFormChange).
 */
function setup(distanceUnit: DistanceUnitDef, arrivalCircleMeters: number) {
  const app = {
    config: {
      units: { distance: distanceUnit },
      course: { arrivalCircle: arrivalCircleMeters }
    },
    skApiVersion: 2
  };
  TestBed.configureTestingModule({
    providers: [
      CourseSettingsModal,
      { provide: AppFacade, useValue: app },
      { provide: SKStreamFacade, useValue: { delta$: () => of() } },
      {
        provide: SignalKClient,
        useValue: { api: { get: () => of({}), putWithContext: () => of({}) } }
      },
      {
        provide: CourseService,
        useValue: {
          courseData: () => ({ arrivalCircle: arrivalCircleMeters })
        }
      },
      {
        provide: ChangeDetectorRef,
        useValue: { detectChanges: () => undefined }
      },
      { provide: MatBottomSheetRef, useValue: { dismiss: () => undefined } },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: { title: 'Course Settings' } }
    ]
  });
  return TestBed.inject(CourseSettingsModal);
}

describe('CourseSettingsModal Arrival Circle unit conversion (#639)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('converts meters to km for display when Distance preference is kilometer', () => {
    const modal = setup('kilometer', 100);
    modal.ngOnInit();
    expect(modal.frmArrivalCircle).toBeCloseTo(0.1, 6); // 100 m -> 0.1 km, not 100
  });

  it('converts meters to nm for display when Distance preference is naut-mile', () => {
    const modal = setup('naut-mile', 1852);
    modal.ngOnInit();
    expect(modal.frmArrivalCircle).toBeCloseTo(1, 6); // 1852 m -> 1 nm
  });

  it('converts km input back to meters on save when Distance preference is kilometer', () => {
    const modal = setup('kilometer', 100);
    modal.ngOnInit();
    modal.onFormChange({ target: { id: 'arrivalCircle', value: '1' } });
    expect(modal.app.config.course.arrivalCircle).toBeCloseTo(1000, 6); // 1 km -> 1000 m, not 1
  });

  it('converts nm input back to meters on save when Distance preference is naut-mile', () => {
    const modal = setup('naut-mile', 1852);
    modal.ngOnInit();
    modal.onFormChange({ target: { id: 'arrivalCircle', value: '1' } });
    expect(modal.app.config.course.arrivalCircle).toBeCloseTo(1852, 6); // 1 nm -> 1852 m
  });
});
