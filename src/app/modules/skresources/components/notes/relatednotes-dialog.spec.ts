import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { RelatedNotesDialog } from './relatednotes-dialog';
import { AppFacade } from 'src/app/app.facade';
import { SKNote } from '../../resource-classes';

describe('RelatedNotesDialog — note date', () => {
  const note = (name: string, extra: object = {}) =>
    new SKNote({
      name,
      group: 'ActiveCaptain',
      mimeType: 'text/plain',
      properties: {},
      ...extra
    });

  const cardText = () => {
    TestBed.configureTestingModule({
      imports: [RelatedNotesDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            notes: [
              ['n1', note('Dated', { timestamp: '2026-05-04T10:20:30Z' })],
              ['n2', note('Undated')]
            ],
            relatedBy: 'group',
            readOnly: true
          }
        },
        { provide: AppFacade, useValue: {} }
      ]
    });
    const fixture = TestBed.createComponent(RelatedNotesDialog);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll(
      'mat-card'
    ) as NodeListOf<HTMLElement>;
    return Array.from(cards, (card) => card.textContent ?? '');
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows the date only for a note that has one', () => {
    const [dated, undated] = cardText();

    expect(dated).toContain('Date:');
    expect(dated).toContain('2026-05-04');
    expect(undated).not.toContain('Date:');
  });
});
