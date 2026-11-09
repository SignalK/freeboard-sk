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

// Node 26 ships its own Web Storage globals: localStorage is undefined unless
// Node runs with --localstorage-file, and sessionStorage is Node's own store,
// not an instance of jsdom's Storage. Either way they shadow jsdom's, so hand
// specs jsdom's in-memory storage whenever a jsdom window exists. Remove this
// once on vitest 5, which does it itself (vitest-dev/vitest#10293).
const domWindow = (
  globalThis as typeof globalThis & { jsdom?: { window: Window } }
).jsdom?.window;
if (domWindow) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      value: domWindow[name],
      configurable: true,
      writable: true
    });
  }
}
