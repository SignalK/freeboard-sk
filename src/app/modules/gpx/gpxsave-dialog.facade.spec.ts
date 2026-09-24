import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SignalKClient } from 'signalk-client-angular';
import { GPXSaveFacade } from './gpxsave-dialog.facade';

const NOTHING = {
  rte: { selected: [] },
  wpt: { selected: [] },
  trk: { tracks: [] }
};

/** The facade with the save picker rejecting as `name`. */
function facadeWithPickerError(name: string) {
  vi.stubGlobal('showSaveFilePicker', () =>
    Promise.reject(new DOMException('picker refused', name))
  );
  TestBed.configureTestingModule({
    providers: [GPXSaveFacade, { provide: SignalKClient, useValue: {} }]
  });
  const facade = TestBed.inject(GPXSaveFacade);
  facade.hasFSA = true;
  const legacy = vi
    .spyOn(facade, 'legacySaveToFile')
    .mockImplementation(() => undefined);
  const results: number[] = [];
  facade.result$.subscribe((r) => results.push(r));
  return { facade, legacy, results };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('GPXSaveFacade save picker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('downloads the file when the user gesture has expired', async () => {
    // a range export waits for the server before the picker opens
    const { facade, legacy, results } = facadeWithPickerError('SecurityError');
    facade.saveToFile({ routes: [], waypoints: [] }, NOTHING);
    await settle();
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it('reports a dismissed picker as cancelled', async () => {
    const { facade, legacy, results } = facadeWithPickerError('AbortError');
    facade.saveToFile({ routes: [], waypoints: [] }, NOTHING);
    await settle();
    expect(legacy).not.toHaveBeenCalled();
    expect(results).toEqual([-1]);
  });
});
