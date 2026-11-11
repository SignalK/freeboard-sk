import { describe, expect, it } from 'vitest';
import {
  MONITOR_MIN_WIDTH,
  PlacedWidget,
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
  it('starts each class at its minimum width', () => {
    expect(screenClassOf(TABLET_MIN_WIDTH - 1)).toBe('phone');
    expect(screenClassOf(TABLET_MIN_WIDTH)).toBe('tablet');
    expect(screenClassOf(MONITOR_MIN_WIDTH - 1)).toBe('tablet');
    expect(screenClassOf(MONITOR_MIN_WIDTH)).toBe('monitor');
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
