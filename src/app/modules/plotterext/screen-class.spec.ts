import { describe, expect, it } from 'vitest';
import {
  MONITOR_MIN_WIDTH,
  PlacedWidget,
  TABLET_MIN_HEIGHT,
  TABLET_MIN_WIDTH,
  minScreenOf,
  screenClassOf,
  shownOn
} from './types';

const placed = (minScreen?: string): PlacedWidget => ({
  instanceId: 'i',
  extension: 'e',
  widget: 'w',
  anchor: 'tr',
  col: 0,
  row: 0,
  ...(minScreen !== undefined && { minScreen })
});

describe('screenClassOf', () => {
  const tall = TABLET_MIN_HEIGHT;

  it('starts each class at its minimum width', () => {
    expect(screenClassOf(TABLET_MIN_WIDTH - 1, tall)).toBe('phone');
    expect(screenClassOf(TABLET_MIN_WIDTH, tall)).toBe('tablet');
    expect(screenClassOf(MONITOR_MIN_WIDTH - 1, tall)).toBe('tablet');
    expect(screenClassOf(MONITOR_MIN_WIDTH, tall)).toBe('monitor');
  });

  it('keeps a phone on its side a phone', () => {
    // iPhone 15 Pro in landscape, Safari toolbars shown
    expect(screenClassOf(852, 340)).toBe('phone');
    expect(screenClassOf(MONITOR_MIN_WIDTH, TABLET_MIN_HEIGHT - 1)).toBe(
      'phone'
    );
  });
});

describe('shownOn', () => {
  it('shows a widget without a class on every screen', () => {
    expect(shownOn(placed(), 'phone')).toBe(true);
    expect(shownOn(placed(), 'monitor')).toBe(true);
  });

  it('hides a tablet widget on phones only', () => {
    expect(shownOn(placed('tablet'), 'phone')).toBe(false);
    expect(shownOn(placed('tablet'), 'tablet')).toBe(true);
    expect(shownOn(placed('tablet'), 'monitor')).toBe(true);
  });

  it('shows a monitor widget on monitors only', () => {
    expect(shownOn(placed('monitor'), 'tablet')).toBe(false);
    expect(shownOn(placed('monitor'), 'monitor')).toBe(true);
  });

  it('shows a widget with a class it does not know everywhere', () => {
    expect(minScreenOf(placed('wall'))).toBe('phone');
    expect(shownOn(placed('wall'), 'phone')).toBe(true);
  });
});
