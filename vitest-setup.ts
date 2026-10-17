// jsdom has no Web Audio API; the alarm sounds only need these calls to exist.
class AudioContextMock {
  createOscillator() {}
  createGain() {
    return {
      connect: () => {},
      disconnect: () => {}
    };
  }
}

const testGlobal = globalThis as typeof globalThis & {
  webkitAudioContext?: unknown;
};
testGlobal.AudioContext = AudioContextMock as unknown as typeof AudioContext;
testGlobal.webkitAudioContext = AudioContextMock;

// jsdom implements neither of these; rendering AppComponent needs both —
// matchMedia for dark-mode detection, ResizeObserver for the OpenLayers map.
testGlobal.matchMedia = (media: string): MediaQueryList =>
  ({
    media,
    matches: false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList;
testGlobal.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
};
