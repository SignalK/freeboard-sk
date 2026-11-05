import { TestBed } from '@angular/core/testing';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SignalKClient } from 'signalk-client-angular';

import { AtoNPropertiesModal } from './aton-properties-modal';
import { AppFacade } from 'src/app/app.facade';
import { SKAtoN, SKSensorTarget } from 'src/app/modules';

/** The properties sheet lists the motion a target's popover shows. */
describe('AtoNPropertiesModal — properties', () => {
  const NAVIGATION = {
    navigation: {
      position: { value: { latitude: 52.1, longitude: 4.2 } },
      speedOverGround: { value: 3 },
      courseOverGroundTrue: { value: 1.5 }
    }
  };

  const propertiesOf = (id: string, target: SKAtoN | SKSensorTarget) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppFacade,
          useValue: {
            config: { units: { positionFormat: 'XY' } },
            formatValueForDisplay: (v: number, unit: string) => `${v} ${unit}`
          }
        },
        {
          provide: SignalKClient,
          useValue: { api: { get: () => of(NAVIGATION) } }
        },
        { provide: MatBottomSheetRef, useValue: { dismiss: () => undefined } },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: { title: '', target, id, icon: '', type: 'aton' }
        }
      ]
    });
    const fixture = TestBed.createComponent(AtoNPropertiesModal);
    fixture.detectChanges();
    return (
      fixture.componentInstance as unknown as {
        properties: Record<string, unknown>;
      }
    ).properties;
  };

  it('lists the speed and course of a sensor target', () => {
    const props = propertiesOf('targets.radar:nav1-17', new SKSensorTarget());
    expect(props['navigation.speedOverGround']).toBe('3 m/s');
    expect(props['navigation.courseOverGroundTrue']).toBe('1.5 rad');
  });

  it('lists only the position of an AtoN', () => {
    const props = propertiesOf(
      'atons.urn:mrn:imo:mmsi:992446000',
      new SKAtoN()
    );
    expect(Object.keys(props)).toEqual(['navigation.position']);
  });
});
