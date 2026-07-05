import { expect, describe, it } from 'vitest';
import { computeCursorEta } from './cursor-eta';
import { Position } from 'src/app/types';

const FROM: Position = [0, 0];
const TO: Position = [0, 0.1]; // ~11 km due north

describe('computeCursorEta', () => {
  it('reports distance and a due-north bearing to the cursor', () => {
    const info = computeCursorEta(FROM, TO, 5, 3);
    expect(info.distance).toBeGreaterThan(0);
    expect(info.bearing).toBeCloseTo(0, 0);
  });

  it('uses SOG for the ETA when under way', () => {
    const info = computeCursorEta(FROM, TO, 5, 3);
    expect(info.timeToGo).toBeCloseTo(info.distance / 5, 5);
  });

  it('falls back to the reference speed when SOG is ~0', () => {
    const info = computeCursorEta(FROM, TO, 0, 3);
    expect(info.timeToGo).toBeCloseTo(info.distance / 3, 5);
  });

  it('treats a negligible SOG as stopped and uses the reference speed', () => {
    const info = computeCursorEta(FROM, TO, 0.01, 3);
    expect(info.timeToGo).toBeCloseTo(info.distance / 3, 5);
  });

  it('returns a null ETA when stopped with no reference speed', () => {
    const info = computeCursorEta(FROM, TO, 0, 0);
    expect(info.timeToGo).toBeNull();
  });
});
