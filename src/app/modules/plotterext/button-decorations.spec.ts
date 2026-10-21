import { describe, expect, it } from 'vitest';
import {
  applyDecorate,
  decorationToolbarFields,
  resolveDecoration
} from './button-decorations';

describe('resolveDecoration', () => {
  it('is normal, with no colours or badge, by default', () => {
    expect(resolveDecoration({})).toEqual({ style: 'normal', badge: 0 });
  });

  it('takes the manifest values', () => {
    expect(
      resolveDecoration({
        style: 'alarm',
        colors: { fg: '#000000', bg: '#FFD600' },
        badge: 3
      })
    ).toEqual({
      style: 'alarm',
      colors: { fg: '#000000', bg: '#FFD600' },
      badge: 3
    });
  });

  it('ignores invalid manifest values', () => {
    expect(
      resolveDecoration({
        style: 'flashing',
        colors: { fg: 'yellow', bg: '#fff' },
        badge: -2
      })
    ).toEqual({ style: 'normal', badge: 0 });
    expect(
      resolveDecoration({ colors: { fg: 'red', bg: '#112233' }, badge: 1.5 })
    ).toEqual({ style: 'normal', colors: { bg: '#112233' }, badge: 0 });
  });

  it('lets the choices override the manifest', () => {
    const manifest = { style: 'warning', colors: { bg: '#ffd600' }, badge: 2 };
    expect(resolveDecoration(manifest, { style: 'active', badge: 0 })).toEqual({
      style: 'active',
      colors: { bg: '#ffd600' },
      badge: 0
    });
    expect(resolveDecoration(manifest, { colors: {} })).toEqual({
      style: 'warning',
      badge: 2
    });
  });
});

describe('applyDecorate', () => {
  it('changes only the decorations given', () => {
    expect(applyDecorate({ style: 'active' }, { badge: 1 })).toEqual({
      style: 'active',
      badge: 1
    });
  });

  it('drops a choice on null', () => {
    expect(
      applyDecorate(
        { style: 'active', colors: { fg: '#000000' }, badge: 1 },
        { style: null, colors: null }
      )
    ).toEqual({ badge: 1 });
  });

  it('replaces colors as a whole', () => {
    expect(
      applyDecorate(
        { colors: { fg: '#000000', bg: '#ffffff' } },
        { colors: { bg: '#ff0000' } }
      )
    ).toEqual({ colors: { bg: '#ff0000' } });
  });

  it('leaves the current choices untouched', () => {
    const current = { badge: 1 };
    applyDecorate(current, { badge: 2 });
    expect(current).toEqual({ badge: 1 });
  });
});

describe('decorationToolbarFields', () => {
  it('draws normal as an ordinary button', () => {
    expect(decorationToolbarFields({ style: 'normal', badge: 0 })).toEqual({});
  });

  it('draws active as a toggle that is on', () => {
    expect(decorationToolbarFields({ style: 'active', badge: 0 })).toEqual({
      active: true,
      pressed: true
    });
  });

  it('draws warning and alarm as tones', () => {
    expect(decorationToolbarFields({ style: 'warning', badge: 0 })).toEqual({
      tone: 'warning'
    });
    expect(decorationToolbarFields({ style: 'alarm', badge: 0 })).toEqual({
      tone: 'alarm'
    });
  });

  it('passes the colours and a badge through', () => {
    expect(
      decorationToolbarFields({
        style: 'normal',
        colors: { bg: '#ffd600' },
        badge: 3
      })
    ).toEqual({ colors: { bg: '#ffd600' }, badge: 3 });
  });
});
