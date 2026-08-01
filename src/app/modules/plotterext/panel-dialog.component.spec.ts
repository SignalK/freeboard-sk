import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlotterPanelDialog } from './panel-dialog.component';
import { PlotterExtensionService } from './plotterext.service';

describe('PlotterPanelDialog with no configuration panel', () => {
  let fixture: ComponentFixture<PlotterPanelDialog>;

  const message = () =>
    fixture.nativeElement.querySelector('.pe-panel-noconfig') as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlotterPanelDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            extension: 'test-ext',
            panel: null,
            title: 'Wind Steer',
            targetInstance: 'inst-1',
            targetWidget: 'wind-steer'
          }
        },
        {
          provide: PlotterExtensionService,
          useValue: {
            resolveAssetUrl: (u: string) => u,
            attachPanel: () => () => undefined,
            removeWidget: () => undefined
          }
        }
      ]
    });

    fixture = TestBed.createComponent(PlotterPanelDialog);
    fixture.detectChanges();
  });

  it('tells the user the widget has no settings', () => {
    expect(message()?.textContent?.trim()).toBe('This widget has no settings.');
  });

  // Regression guard for #653. The message carries no colour of its own, so it
  // takes mat-dialog-content's themed supporting-text colour, which follows the
  // dark theme. The ancestor colour set below stands in for that themed
  // foreground: a colour pinned on the element would win over it and fail here.
  it('takes its colour from the dialog rather than a hard-coded one', () => {
    (fixture.nativeElement as HTMLElement).style.color = 'rgb(1, 2, 3)';
    expect(getComputedStyle(message()).color).toBe('rgb(1, 2, 3)');
  });
});
