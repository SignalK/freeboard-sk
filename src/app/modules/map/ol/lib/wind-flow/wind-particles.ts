import { apply, Transform } from 'ol/transform';

import { windColor, WIND_COLOR_MAX } from 'src/app/modules/weather/wind-field';

/** The part of an OpenLayers frame the particles need, in CSS pixels. */
export interface FlowView {
  width: number;
  height: number;
  coordinateToPixel: Transform;
  pixelToCoordinate: Transform;
  /** Map units per CSS pixel. */
  resolution: number;
}

/** The wind at a projected (EPSG:3857) coordinate, as `[u, v]` m/s into
 *  `out`; false where there is no wind data. */
export type FlowSampler = (x: number, y: number, out: number[]) => boolean;

/** Points kept per trail, one every `RECORD_INTERVAL` seconds: a trail
 *  covers the last second, about 60 px in a 10 m/s wind. */
export const TRAIL_POINTS = 16;
export const RECORD_INTERVAL = 0.06;
/** On-screen speed of a particle, in CSS px per second for each m/s of wind.
 *  It is a display speed: true speed would be invisible at most zooms. */
const PX_PER_SECOND_PER_MPS = 6;
const LIFE_MIN = 1.5;
const LIFE_MAX = 4.5;
/** A particle further than this outside the view is recycled. */
const VIEW_MARGIN = 24;
/** One particle for this many CSS px² of map, within the bounds below. */
const AREA_PER_PARTICLE = 700;
const MIN_PARTICLES = 200;
const MAX_PARTICLES = 4000;

export function particleCountFor(width: number, height: number) {
  return Math.round(
    Math.min(
      MAX_PARTICLES,
      Math.max(MIN_PARTICLES, (width * height) / AREA_PER_PARTICLE)
    )
  );
}

/**
 * Particles carried by the wind. Positions are kept in map coordinates, not
 * pixels, along with a short history of where each has been: a frame is
 * redrawn from that history, so trails stay attached to the chart through
 * pans, zooms and the constant rotation of a heading-up chart, and nothing
 * accumulates on the canvas between frames.
 *
 * A particle that reaches the end of its life stops and lets its trail
 * catch up with it before it is reborn somewhere else, so trails fade out
 * instead of vanishing.
 */
export class WindParticles {
  count = 0;
  x = new Float64Array(0);
  y = new Float64Array(0);
  /** Wind speed at the particle, m/s. */
  speed = new Float32Array(0);
  private age = new Float32Array(0);
  private life = new Float32Array(0);
  /** Records left before a dying particle is reborn; 0 while alive. */
  private dying = new Uint8Array(0);
  // Trail ring buffers: TRAIL_POINTS slots per particle.
  private hx = new Float64Array(0);
  private hy = new Float64Array(0);
  private hNext = new Uint8Array(0);
  private hCount = new Uint8Array(0);
  private sinceRecord = 0;
  private readonly wind = [0, 0];
  private readonly pixel = [0, 0];

  constructor(private random: () => number = Math.random) {}

  /** Sets the number of particles, scattering them over the view with
   *  staggered ages so they don't all die together. */
  reset(count: number, view: FlowView) {
    this.count = count;
    this.x = new Float64Array(count);
    this.y = new Float64Array(count);
    this.speed = new Float32Array(count);
    this.age = new Float32Array(count);
    this.life = new Float32Array(count);
    this.dying = new Uint8Array(count);
    this.hx = new Float64Array(count * TRAIL_POINTS);
    this.hy = new Float64Array(count * TRAIL_POINTS);
    this.hNext = new Uint8Array(count);
    this.hCount = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      this.respawn(i, view);
      this.age[i] = this.random() * this.life[i];
    }
  }

  /** Moves every particle `dt` seconds along the wind. */
  step(dt: number, sample: FlowSampler, view: FlowView) {
    const scale = PX_PER_SECOND_PER_MPS * view.resolution * dt;
    this.sinceRecord += dt;
    const record = this.sinceRecord >= RECORD_INTERVAL;
    if (record) {
      this.sinceRecord = 0;
    }
    for (let i = 0; i < this.count; i++) {
      if (this.dying[i] > 0) {
        if (record) {
          this.push(i);
          if (--this.dying[i] === 0) {
            this.respawn(i, view);
          }
        }
        continue;
      }
      this.age[i] += dt;
      if (!sample(this.x[i], this.y[i], this.wind)) {
        this.respawn(i, view);
        continue;
      }
      const [u, v] = this.wind;
      this.speed[i] = Math.hypot(u, v);
      this.x[i] += u * scale;
      this.y[i] += v * scale;
      this.pixel[0] = this.x[i];
      this.pixel[1] = this.y[i];
      apply(view.coordinateToPixel, this.pixel);
      if (
        this.pixel[0] < -VIEW_MARGIN ||
        this.pixel[1] < -VIEW_MARGIN ||
        this.pixel[0] > view.width + VIEW_MARGIN ||
        this.pixel[1] > view.height + VIEW_MARGIN
      ) {
        this.respawn(i, view);
        continue;
      }
      if (record) {
        this.push(i);
      }
      if (this.age[i] >= this.life[i]) {
        this.dying[i] = TRAIL_POINTS;
      }
    }
  }

  /**
   * Calls `segment` for each piece of every trail, from the oldest to the
   * particle itself. `level` runs from 0, the faintest, to
   * `TRAIL_POINTS - 1` at the particle, whatever the trail's length, so a
   * young trail is already bright at its head.
   */
  forEachSegment(
    segment: (
      i: number,
      level: number,
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ) => void
  ) {
    for (let i = 0; i < this.count; i++) {
      const n = this.hCount[i];
      if (n === 0) {
        continue;
      }
      const base = i * TRAIL_POINTS;
      let slot = (this.hNext[i] - n + TRAIL_POINTS) % TRAIL_POINTS;
      let px = this.hx[base + slot];
      let py = this.hy[base + slot];
      for (let k = 1; k <= n; k++) {
        let qx: number;
        let qy: number;
        if (k < n) {
          slot = (slot + 1) % TRAIL_POINTS;
          qx = this.hx[base + slot];
          qy = this.hy[base + slot];
        } else {
          qx = this.x[i];
          qy = this.y[i];
        }
        if (qx !== px || qy !== py) {
          segment(i, TRAIL_POINTS - 1 - (n - k), px, py, qx, qy);
        }
        px = qx;
        py = qy;
      }
    }
  }

  private push(i: number) {
    const slot = i * TRAIL_POINTS + this.hNext[i];
    this.hx[slot] = this.x[i];
    this.hy[slot] = this.y[i];
    this.hNext[i] = (this.hNext[i] + 1) % TRAIL_POINTS;
    if (this.hCount[i] < TRAIL_POINTS) {
      this.hCount[i]++;
    }
  }

  private respawn(i: number, view: FlowView) {
    this.pixel[0] = this.random() * view.width;
    this.pixel[1] = this.random() * view.height;
    apply(view.pixelToCoordinate, this.pixel);
    this.x[i] = this.pixel[0];
    this.y[i] = this.pixel[1];
    this.age[i] = 0;
    this.life[i] = LIFE_MIN + this.random() * (LIFE_MAX - LIFE_MIN);
    this.dying[i] = 0;
    this.hCount[i] = 0;
    this.hNext[i] = 0;
    this.speed[i] = 0;
  }
}

/** Speed bands used to colour particles, so a frame is a few dozen strokes
 *  instead of one per segment. */
export const COLOR_BANDS = 16;

export function colorBand(speed: number) {
  return Math.min(
    COLOR_BANDS - 1,
    Math.max(0, Math.floor((speed / WIND_COLOR_MAX) * COLOR_BANDS))
  );
}

/** The `[r, g, b]` of each colour band, at its middle speed. */
export function colorBandColors(): number[][] {
  return Array.from({ length: COLOR_BANDS }, (_, b) =>
    windColor(((b + 0.5) / COLOR_BANDS) * WIND_COLOR_MAX, [0, 0, 0])
  );
}
