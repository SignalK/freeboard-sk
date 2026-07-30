import { expect, describe, it, beforeEach } from 'vitest';
import {
  completeVertexDeleteIndicator,
  hideVertexDeleteIndicator,
  showVertexDeleteIndicator
} from './vertex-delete-indicator';

const EL = '#fb-vertex-delete-indicator';

describe('vertex delete indicator', () => {
  beforeEach(() => {
    hideVertexDeleteIndicator();
  });

  it('shows a positioned indicator with a fill timed to the hold and a trash icon', () => {
    showVertexDeleteIndicator(120, 80, 1320);
    const el = document.querySelector(EL) as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.left).toBe('120px');
    expect(el.style.top).toBe('80px');
    expect(el.querySelector('.fb-vdi-icon')).not.toBeNull();
    const fill = el.querySelector('.fb-vdi-fill') as HTMLElement;
    expect(fill.style.animationDuration).toBe('1320ms');
  });

  it('replaces an indicator already showing rather than stacking', () => {
    showVertexDeleteIndicator(0, 0, 1000);
    showVertexDeleteIndicator(0, 0, 1000);
    expect(document.querySelectorAll(EL).length).toBe(1);
  });

  it('turns red on completion', () => {
    showVertexDeleteIndicator(0, 0, 1000);
    completeVertexDeleteIndicator();
    expect(document.querySelector(EL)?.classList.contains('fb-vdi-done')).toBe(
      true
    );
  });

  it('removes the indicator when hidden', () => {
    showVertexDeleteIndicator(0, 0, 1000);
    hideVertexDeleteIndicator();
    expect(document.querySelector(EL)).toBeNull();
  });

  it('injects its stylesheet only once', () => {
    showVertexDeleteIndicator(0, 0, 1000);
    hideVertexDeleteIndicator();
    showVertexDeleteIndicator(0, 0, 1000);
    expect(
      document.querySelectorAll('#fb-vertex-delete-indicator-style').length
    ).toBe(1);
  });
});
