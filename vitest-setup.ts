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

// Node 26 ships its own Web Storage globals, which are undefined unless Node
// runs with --localstorage-file. They shadow jsdom's, so specs would find no
// localStorage at all; hand them jsdom's in-memory storage instead.
const domWindow = (
  globalThis as typeof globalThis & { jsdom?: { window: Window } }
).jsdom?.window;
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (domWindow && typeof globalThis[name] === 'undefined') {
    Object.defineProperty(globalThis, name, {
      value: domWindow[name],
      configurable: true,
      writable: true
    });
  }
}
