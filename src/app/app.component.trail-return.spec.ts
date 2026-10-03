import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';
import { SKSTREAM_MODE } from './modules';

// In a background tab the browser holds back (or freezes) the timer that
// extends the local trail, so on return the trail would run straight from
// where it stopped to the vessel. Exercised on a bare prototype instance: the
// handler touches only the facade and the stream.
describe('AppComponent — trail on returning to the page', () => {
  const component = (
    trail = true,
    serverTrailWanted = true,
    mode = SKSTREAM_MODE.REALTIME
  ) => {
    const cmp = Object.create(AppComponent.prototype);
    cmp.mode = mode;
    cmp.app = {
      config: { vessels: { trail } },
      serverTrailWanted: () => serverTrailWanted
    };
    cmp.stream = { requestTrailFromServer: vi.fn() };
    return cmp as unknown as {
      onVisibilityChange: () => void;
      stream: { requestTrailFromServer: ReturnType<typeof vi.fn> };
    };
  };
  const pageIs = (state: DocumentVisibilityState) =>
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

  afterEach(() => vi.restoreAllMocks());

  it('fetches the server trail again when the page is shown', () => {
    pageIs('visible');
    const cmp = component();
    cmp.onVisibilityChange();
    expect(cmp.stream.requestTrailFromServer).toHaveBeenCalledOnce();
  });

  it('fetches nothing when the page is hidden', () => {
    pageIs('hidden');
    const cmp = component();
    cmp.onVisibilityChange();
    expect(cmp.stream.requestTrailFromServer).not.toHaveBeenCalled();
  });

  it('fetches nothing with the trail hidden or kept on this device', () => {
    pageIs('visible');
    [component(false), component(true, false)].forEach((cmp) => {
      cmp.onVisibilityChange();
      expect(cmp.stream.requestTrailFromServer).not.toHaveBeenCalled();
    });
  });

  it('fetches nothing during history playback', () => {
    pageIs('visible');
    const cmp = component(true, true, SKSTREAM_MODE.PLAYBACK);
    cmp.onVisibilityChange();
    expect(cmp.stream.requestTrailFromServer).not.toHaveBeenCalled();
  });
});
