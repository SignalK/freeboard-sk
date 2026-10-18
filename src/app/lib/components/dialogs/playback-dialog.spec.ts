import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, it, expect } from 'vitest';

import { PlaybackDialog } from './playback-dialog';

describe('PlaybackDialog start time picker', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PlaybackDialog,
        { provide: MatDialogRef, useValue: { close: (): void => undefined } }
      ]
    });
  });

  it('offers every minute from 00 to 59', () => {
    const values = TestBed.inject(PlaybackDialog).minValues();
    expect(values).toHaveLength(60);
    expect(values[0]).toBe('00');
    expect(values[59]).toBe('59');
  });
});
