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

  it('lists the position, speed and course a sensor target is drawn with', () => {
    // a linked target is drawn with its freshest sensor's values, which can
    // differ from what the server holds for the target itself
    const shown = new SKSensorTarget();
    shown.position = [4.3, 52.3];
    shown.sog = 4;
    shown.cog = 0.5;
    const props = propertiesOf('targets.radar:nav1-17', shown);
    expect(props['navigation.position']).toEqual({
      longitude: 4.3,
      latitude: 52.3
    });
    expect(props['navigation.speedOverGround']).toBe('4 m/s');
    expect(props['navigation.courseOverGroundTrue']).toBe('0.5 rad');
  });

  it('lists only the position of an AtoN', () => {
    const props = propertiesOf(
      'atons.urn:mrn:imo:mmsi:992446000',
      new SKAtoN()
    );
    expect(Object.keys(props)).toEqual(['navigation.position']);
  });
});
