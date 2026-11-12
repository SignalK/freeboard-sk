import { describe, it, expect } from 'vitest';
import { createDisplayMethods } from './display-methods';

describe('display.get', () => {
  it('returns the chosen panel opacity', async () => {
    const methods = createDisplayMethods({
      getState: () => ({ panelOpacity: 0.7 })
    });
    expect(await methods['display.get'](undefined, {} as never)).toEqual({
      panelOpacity: 0.7
    });
  });

  it('returns null when the user chose none', async () => {
    const methods = createDisplayMethods({
      getState: () => ({ panelOpacity: null })
    });
    expect(await methods['display.get'](undefined, {} as never)).toEqual({
      panelOpacity: null
    });
  });
});
