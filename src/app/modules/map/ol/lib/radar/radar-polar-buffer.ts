// A jump of more than this share of a revolution between two spokes is not
// a gap the radar left: it is a repeated angle (the DRS4D sends each one
// twice), a step back as the boat yaws, or a restart of the sweep. Filling
// it would paint one spoke across much of the picture.
const MAX_GAP_FRACTION = 1 / 32;

/**
 * The radar picture in polar form, for a texture: one row per bearing from
 * north, one byte per sample holding its legend index.
 *
 * Radars that report more spokes than they send (`hasSparseSpokes`, e.g. a
 * Furuno at 8192 that sends about 800) leave rows between two spokes that
 * nothing writes. Drawn as they are, those rows show as dark stripes, and
 * whatever an earlier sweep left in them stays. So each spoke is also written
 * over the rows skipped since the previous one, which every sweep then
 * renews.
 */
export class RadarPolarBuffer {
  /** Fewer than the spokes per revolution when a texture cannot be that tall. */
  readonly rows: number;
  readonly data: Uint8Array;
  private readonly dirty: Uint8Array;
  private lastRow = -1;

  constructor(
    readonly spokesPerRevolution: number,
    readonly samples: number,
    maxRows: number
  ) {
    this.rows = Math.min(spokesPerRevolution, maxRows);
    this.data = new Uint8Array(this.rows * samples);
    this.dirty = new Uint8Array(this.rows);
  }

  /** Writes a spoke at `bearing`, counted in spokes clockwise from north;
   *  one past north either way, as a heading offset can give, wraps round. */
  write(bearing: number, spoke: Uint8Array) {
    const n = this.spokesPerRevolution;
    const row = Math.floor(((((bearing % n) + n) % n) * this.rows) / n);
    if (this.lastRow >= 0) {
      const gap = (row - this.lastRow + this.rows) % this.rows;
      if (gap > 1 && gap < this.rows * MAX_GAP_FRACTION) {
        for (let i = 1; i < gap; i++) {
          this.writeRow((this.lastRow + i) % this.rows, spoke);
        }
      }
    }
    this.writeRow(row, spoke);
    this.lastRow = row;
  }

  /** Empties the picture, as after a change of range. */
  clear() {
    this.data.fill(0);
    this.dirty.fill(1);
    this.lastRow = -1;
  }

  /** The runs of rows written since the last call, as [first, end) pairs. */
  takeDirtyRows(): Array<[number, number]> {
    const runs: Array<[number, number]> = [];
    let start = -1;
    for (let r = 0; r < this.rows; r++) {
      if (this.dirty[r]) {
        if (start < 0) {
          start = r;
        }
      } else if (start >= 0) {
        runs.push([start, r]);
        start = -1;
      }
    }
    if (start >= 0) {
      runs.push([start, this.rows]);
    }
    this.dirty.fill(0);
    return runs;
  }

  private writeRow(row: number, spoke: Uint8Array) {
    const offset = row * this.samples;
    const length = Math.min(spoke.length, this.samples);
    this.data.set(spoke.subarray(0, length), offset);
    this.data.fill(0, offset + length, offset + this.samples);
    this.dirty[row] = 1;
  }
}
