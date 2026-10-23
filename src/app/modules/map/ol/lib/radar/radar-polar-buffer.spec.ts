import { describe, expect, it } from 'vitest';
import { RadarPolarBuffer } from './radar-polar-buffer';

const spoke = (...values: number[]) => new Uint8Array(values);
const row = (buffer: RadarPolarBuffer, r: number) =>
  Array.from(
    buffer.data.subarray(r * buffer.samples, (r + 1) * buffer.samples)
  );
const rows = (buffer: RadarPolarBuffer, first: number, end: number) =>
  Array.from({ length: end - first }, (_, i) => row(buffer, first + i));

describe('RadarPolarBuffer', () => {
  it('writes a spoke at its bearing and clears the samples past its end', () => {
    const buffer = new RadarPolarBuffer(16, 4, 4096, true);
    buffer.write(3, spoke(5, 6, 7, 8));
    buffer.write(3, spoke(1));
    expect(row(buffer, 3)).toEqual([1, 0, 0, 0]);
  });

  it('repeats a spoke over the bearings a sparse radar skipped', () => {
    const buffer = new RadarPolarBuffer(1024, 2, 4096, true);
    buffer.write(100, spoke(1, 1));
    buffer.write(108, spoke(2, 2));
    expect(row(buffer, 100)).toEqual([1, 1]);
    expect(rows(buffer, 101, 109)).toEqual(Array(8).fill([2, 2]));
    expect(row(buffer, 109)).toEqual([0, 0]);
  });

  it('leaves the skipped rows alone for a radar that sends every spoke', () => {
    const buffer = new RadarPolarBuffer(2048, 1, 4096, false);
    buffer.write(100, spoke(1));
    buffer.write(133, spoke(2));
    expect(rows(buffer, 101, 133)).toEqual(Array(32).fill([0]));
    expect(row(buffer, 133)).toEqual([2]);
  });

  it('does not fill across a repeated angle, a step back or a jump', () => {
    const buffer = new RadarPolarBuffer(1024, 1, 4096, true);
    buffer.write(100, spoke(1));
    buffer.write(100, spoke(2));
    expect(row(buffer, 101)).toEqual([0]);

    // A step back, as when the boat yaws against the sweep.
    buffer.write(90, spoke(3));
    expect(rows(buffer, 91, 100)).toEqual(Array(9).fill([0]));

    // More than 1/32 of a revolution ahead.
    buffer.write(200, spoke(4));
    expect(rows(buffer, 101, 200)).toEqual(Array(99).fill([0]));
    expect(row(buffer, 200)).toEqual([4]);
  });

  // The boat's Furuno DRS4D-NXT reports 8192 spokes but sends about 825, in
  // steps of 6 to 16, and its display's WebGL holds textures of at most 4096
  // rows.
  describe('a radar that sends a tenth of the spokes it reports', () => {
    const sweep = (buffer: RadarPolarBuffer, value: number, from: number) => {
      let bearing = from;
      let step = 0;
      while (bearing < from + 8192 + 16) {
        buffer.write(bearing % 8192, spoke(value, value));
        step = (step + 7) % 11;
        bearing += 6 + step;
      }
    };

    it('covers every bearing in one sweep', () => {
      const buffer = new RadarPolarBuffer(8192, 2, 4096, true);
      sweep(buffer, 3, 0);
      expect(rows(buffer, 0, buffer.rows)).toEqual(
        Array(buffer.rows).fill([3, 3])
      );
    });

    it('replaces every echo of the sweep before', () => {
      const buffer = new RadarPolarBuffer(8192, 2, 4096, true);
      sweep(buffer, 3, 0);
      sweep(buffer, 0, 5);
      expect(rows(buffer, 0, buffer.rows)).toEqual(
        Array(buffer.rows).fill([0, 0])
      );
    });
  });

  it('folds the bearings into fewer rows when a texture cannot hold one per spoke', () => {
    const buffer = new RadarPolarBuffer(8192, 1, 4096, true);
    expect(buffer.rows).toBe(4096);
    buffer.write(8191, spoke(7));
    expect(row(buffer, 4095)).toEqual([7]);
    buffer.write(2, spoke(9));
    expect(rows(buffer, 0, 2)).toEqual([[9], [9]]);
  });

  it('wraps a bearing past north either way', () => {
    const buffer = new RadarPolarBuffer(1024, 1, 4096, true);
    buffer.write(-2, spoke(5));
    expect(row(buffer, 1022)).toEqual([5]);
    buffer.write(1024 + 3, spoke(6));
    expect(row(buffer, 3)).toEqual([6]);
  });

  it('reports the rows written since it was last asked, across north', () => {
    const buffer = new RadarPolarBuffer(1024, 1, 4096, true);
    expect(buffer.takeDirtyRows()).toEqual([]);
    buffer.write(1022, spoke(1));
    buffer.write(1, spoke(1));
    expect(buffer.takeDirtyRows()).toEqual([
      [0, 2],
      [1022, 1024]
    ]);
    expect(buffer.takeDirtyRows()).toEqual([]);
  });

  it('empties the picture and starts a new sweep on a clear', () => {
    const buffer = new RadarPolarBuffer(1024, 1, 4096, true);
    buffer.write(10, spoke(1));
    buffer.takeDirtyRows();
    buffer.clear();
    expect(buffer.data.every((v) => v === 0)).toBe(true);
    expect(buffer.takeDirtyRows()).toEqual([[0, 1024]]);

    buffer.write(14, spoke(2));
    expect(rows(buffer, 11, 14)).toEqual(Array(3).fill([0]));
  });
});
