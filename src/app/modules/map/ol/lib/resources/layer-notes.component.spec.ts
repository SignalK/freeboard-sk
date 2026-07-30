import { describe, it, expect } from 'vitest';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { Style, Icon } from 'ol/style';
import { FreeboardNoteLayerComponent } from './layer-notes.component';
import { FBNotes } from 'src/app/types';

/**
 * `buildStyle()` applies a note's name as its label when the feature is built,
 * for both the symbol and fallback-diamond styles. `updateLabels()` — inherited
 * from FBFeatureLayerComponent and driven by the `labelMinZoom` / `mapZoom`
 * inputs — then refreshes existing features when the zoom threshold is crossed.
 *
 * These are the pieces that have to keep agreeing for a label to appear: the id
 * prefix `updateLabels()` matches on, the feature name both paths read, and the
 * Text each style carries. This spec pins that contract so it can't silently
 * drift apart again.
 *
 * Only plain instance fields are touched, so exercise the layer on a bare
 * prototype instance — no Angular DI needed (same approach as the AIS filter
 * spec alongside).
 */
function layer(fields: {
  mapZoom: number;
  labelMinZoom: number;
  /** omit the symbol to exercise the fallback-diamond style */
  symbol?: boolean;
}) {
  const c = Object.create(
    FreeboardNoteLayerComponent.prototype
  ) as FreeboardNoteLayerComponent;
  Object.assign(c, {
    source: new VectorSource(),
    labelPrefixes: ['note'],
    theme: { labelText: { color: '#000000' } },
    mapImages: {
      getSymbol: () =>
        fields.symbol === false ? undefined : new Icon({ src: 'note.png' })
    },
    ...fields
  });
  return c as unknown as FreeboardNoteLayerComponent & {
    source: VectorSource;
    parseFBNotes: (n: FBNotes) => void;
    updateLabels: () => void;
  };
}

const notes = [
  [
    'abc123',
    {
      name: 'Cape Fear',
      position: { latitude: 33.87, longitude: -78.0 },
      properties: { skIcon: 'anchorage' }
    }
  ]
] as unknown as FBNotes;

function labelOf(source: VectorSource): string {
  const f = source.getFeatures()[0] as Feature;
  return ((f.getStyle() as Style).getText()?.getText() as string) ?? '';
}

describe('notes layer labels', () => {
  it('labels a note with its name at or above the label zoom threshold', () => {
    const c = layer({ mapZoom: 12, labelMinZoom: 10 });
    c.parseFBNotes(notes);
    c.updateLabels();
    expect(labelOf(c.source)).toBe('Cape Fear');
  });

  it('clears the label below the threshold', () => {
    const c = layer({ mapZoom: 8, labelMinZoom: 10 });
    c.parseFBNotes(notes);
    c.updateLabels();
    expect(labelOf(c.source)).toBe('');
  });

  it('gives every note feature the id prefix updateLabels() matches on', () => {
    const c = layer({ mapZoom: 12, labelMinZoom: 10 });
    c.parseFBNotes(notes);
    expect(c.source.getFeatures()[0].getId()).toBe('note.abc123');
  });

  it('labels a note whose icon could not be resolved', () => {
    // The fallback diamond carries no other identification, so losing the
    // label there leaves an anonymous marker.
    const c = layer({ mapZoom: 12, labelMinZoom: 10, symbol: false });
    c.parseFBNotes(notes);
    expect(labelOf(c.source)).toBe('Cape Fear');
  });

  it('labels rebuilt features without waiting for updateLabels()', () => {
    // Notes are re-fetched as the map moves, and ngOnChanges rebuilds every
    // feature after super.ngOnChanges() has already run updateLabels(). A
    // label applied only there goes out with the features it was applied to,
    // so the freshly built feature has to carry its label immediately.
    const c = layer({ mapZoom: 12, labelMinZoom: 10 });
    c.parseFBNotes(notes);
    expect(labelOf(c.source)).toBe('Cape Fear');
  });
});
