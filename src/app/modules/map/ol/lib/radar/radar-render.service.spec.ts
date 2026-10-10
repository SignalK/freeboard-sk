import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RadarRenderService } from './radar-render.service';
import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';

describe('RadarRenderService', () => {
  const showMessage = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      }
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AppFacade, useValue: { showMessage, debug: vi.fn() } },
        { provide: RadarAPIService, useValue: {} }
      ]
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    showMessage.mockReset();
  });

  // The stream closes on every standby, once per watchman cycle.
  it('closes the spoke stream without a message', () => {
    TestBed.inject(RadarRenderService).disconnect();
    expect(showMessage).not.toHaveBeenCalled();
  });
});
