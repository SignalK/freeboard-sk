import { describe, it, expect } from 'vitest';
import { createDisplayMethods } from './display-methods';

describe('display.get', () => {
  it('returns the chosen panel opacity and the color scheme', async () => {
    const methods = createDisplayMethods({
      getState: () => ({ panelOpacity: 0.7, colorScheme: 'dark' })
    });
    expect(await methods['display.get'](undefined, {} as never)).toEqual({
      panelOpacity: 0.7,
      colorScheme: 'dark'
    });
  });

  it('returns null when the user chose no opacity', async () => {
    const methods = createDisplayMethods({
      getState: () => ({ panelOpacity: null, colorScheme: 'light' })
    });
    expect(await methods['display.get'](undefined, {} as never)).toEqual({
      panelOpacity: null,
      colorScheme: 'light'
    });
  });
});
