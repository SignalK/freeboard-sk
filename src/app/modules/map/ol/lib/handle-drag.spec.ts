import { describe, expect, it } from 'vitest';
import { Map } from 'ol';
import { isHandleDrag, setHandleDrag } from './handle-drag';

describe('handle drag marker', () => {
  it('reads false on a map no handle has been grabbed on', () => {
    expect(isHandleDrag(new Map({}))).toBe(false);
  });

  it('is set while a handle is held and cleared when it is let go', () => {
    const map = new Map({});
    setHandleDrag(map, 1);
    expect(isHandleDrag(map)).toBe(true);
    setHandleDrag(map, null);
    expect(isHandleDrag(map)).toBe(false);
  });

  it('treats pointer id 0 as held — some browsers number the first pointer 0', () => {
    const map = new Map({});
    setHandleDrag(map, 0);
    expect(isHandleDrag(map)).toBe(true);
  });
});
