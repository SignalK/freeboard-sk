import { describe, it, expect } from 'vitest';
import {
  isTrackShown,
  toggleTrackSelection,
  shouldRenderTrack
} from './vessel-track';

describe('isTrackShown', () => {
  it('is true only when the id is in the selection', () => {
    expect(isTrackShown(['vessels.a'], 'vessels.a')).toBe(true);
    expect(isTrackShown(['vessels.a'], 'vessels.b')).toBe(false);
  });

  it('is false for an empty or missing selection', () => {
    expect(isTrackShown([], 'vessels.a')).toBe(false);
    expect(isTrackShown(undefined as unknown as string[], 'vessels.a')).toBe(
      false
    );
  });
});

describe('toggleTrackSelection', () => {
  it('adds an id that is not present', () => {
    expect(toggleTrackSelection([], 'vessels.a')).toEqual(['vessels.a']);
  });

  it('removes an id that is present', () => {
    expect(
      toggleTrackSelection(['vessels.a', 'vessels.b'], 'vessels.a')
    ).toEqual(['vessels.b']);
  });

  it('is idempotent when toggled twice', () => {
    const once = toggleTrackSelection([], 'vessels.a');
    const twice = toggleTrackSelection(once, 'vessels.a');
    expect(twice).toEqual([]);
  });

  it('returns a new array reference (never mutates the input)', () => {
    const input = ['vessels.a'];
    const added = toggleTrackSelection(input, 'vessels.b');
    const removed = toggleTrackSelection(input, 'vessels.a');
    expect(added).not.toBe(input);
    expect(removed).not.toBe(input);
    expect(input).toEqual(['vessels.a']); // unchanged
  });
});

describe('shouldRenderTrack', () => {
  it('renders every vessel when show-all is on, regardless of selection', () => {
    expect(shouldRenderTrack('vessels.a', true, [])).toBe(true);
    expect(shouldRenderTrack('vessels.a', true, ['vessels.b'])).toBe(true);
  });

  it('renders only selected vessels when show-all is off', () => {
    expect(shouldRenderTrack('vessels.a', false, ['vessels.a'])).toBe(true);
    expect(shouldRenderTrack('vessels.a', false, ['vessels.b'])).toBe(false);
    expect(shouldRenderTrack('vessels.a', false, [])).toBe(false);
  });
});
