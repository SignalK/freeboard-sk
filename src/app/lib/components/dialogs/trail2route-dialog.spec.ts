import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { Trail2RouteDialog } from './trail2route-dialog';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';
import { SKStreamFacade } from 'src/app/modules/skstream/skstream.facade';

/**
 * The tolerance slider sets how far the route may stray from the trail. It
 * must pass the slider's value to the simplification: a step up from the
 * smallest tolerance keeps nearly every point of a zig-zag trail.
 *
 * The map preview is left out (unknown elements): the slider, the point count
 * and the route they drive are what is tested.
 */
describe('Trail2RouteDialog — tolerance slider', () => {
  // a zig-zag trail north, 27 points
  const trail = Array.from({ length: 27 }, (_, i) => [
    24.95 + (i % 2 ? 0.0006 : -0.0006),
    60.15 + i * 0.0004
  ]);

  const render = (tolerance?: number) => {
    TestBed.overrideComponent(Trail2RouteDialog, {
      set: {
        imports: [
          MatIconModule,
          MatButtonModule,
          MatDialogModule,
          MatTooltipModule,
          MatSliderModule,
          MatCheckboxModule,
          MatToolbarModule
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }
    });
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { trail } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        { provide: SKResourceService, useValue: {} },
        { provide: SKStreamFacade, useValue: { trail$: () => EMPTY } },
        { provide: AppFacade, useValue: { serverTrailWanted: () => false } }
      ]
    });
    const fixture = TestBed.createComponent(Trail2RouteDialog);
    if (tolerance !== undefined) {
      (
        fixture.componentInstance as unknown as { tolerance: number }
      ).tolerance = tolerance;
    }
    fixture.detectChanges();
    return fixture;
  };

  it('simplifies the trail with the tolerance the slider is moved to', () => {
    const fixture = render();
    const dialog = fixture.componentInstance as unknown as {
      tolerance: number;
      pointCount: number;
    };
    expect(dialog.pointCount).toBe(27);

    const thumb = (fixture.nativeElement as HTMLElement).querySelector(
      'input[matSliderThumb]'
    ) as HTMLInputElement;
    thumb.value = '0.000002';
    thumb.dispatchEvent(new Event('input'));
    thumb.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(dialog.tolerance).toBe(0.000002);
    expect(dialog.pointCount).toBe(27);
  });

  it('starts the slider at the current tolerance', () => {
    const fixture = render(0.001);
    const thumb = (fixture.nativeElement as HTMLElement).querySelector(
      'input[matSliderThumb]'
    ) as HTMLInputElement;

    expect(Number(thumb.value)).toBe(0.001);
  });
});
