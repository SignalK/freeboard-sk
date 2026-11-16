import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from '../../app.facade';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { AnchorService } from './anchor.service';
import { Position } from '../../types';

// whenAnchorAt: a move the server accepted waits for the stream to report the
// anchor at its new position before the map lets go of the dragged point.

describe('AnchorService.whenAnchorAt', () => {
  let service: AnchorService;
  let resolved: boolean;

  const streamReports = (position: Position) =>
    (
      service as unknown as {
        parseAnchorStatus(r: { position: Position; maxRadius: number }): void;
      }
    ).parseAnchorStatus({ position, maxRadius: 40 });

  const wait = (position: Position) => {
    resolved = false;
    void service.whenAnchorAt(position).then(() => (resolved = true));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        AnchorService,
        { provide: AppFacade, useValue: { debug: (): void => undefined } },
        { provide: SignalKClient, useValue: {} },
        { provide: SKStreamFacade, useValue: { selfAnchor: signal(null) } }
      ]
    });
    service = TestBed.inject(AnchorService);
    streamReports([178.0, -17.8]);
  });

  afterEach(() => vi.useRealTimers());

  it('resolves when the stream reports the anchor at the position', async () => {
    wait([178.001, -17.801]);
    streamReports([178.0, -17.8]);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);
    streamReports([178.001, -17.801]);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it('resolves at once when the anchor is already there', async () => {
    wait([178.0, -17.8]);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it('gives up after a few seconds when the stream never reports it', async () => {
    wait([178.001, -17.801]);
    await vi.advanceTimersByTimeAsync(2900);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });
});
