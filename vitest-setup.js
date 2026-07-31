// In a file like vitest.setup.js or similar
class AudioContextMock {
  createOscillator() {}
  createGain() {
    return {
      connect: () => {},
      disconnect: () => {}
    };
  }
  // Add other methods that your code uses
}

// Assign the mock to the global window object
global.AudioContext = AudioContextMock;
// Also handle the vendor-prefixed version if your code uses it
global.webkitAudioContext = AudioContextMock;

// jsdom implements neither of these; rendering AppComponent needs both —
// matchMedia for dark-mode detection, ResizeObserver for the OpenLayers map.
global.matchMedia = (media) => ({
  media,
  matches: false,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false
});
global.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
};
