// For a viewer of the radar emulator who may watch it but not change it,
// such as a guest of a read-only demo. Gain, sea and range then act on this
// screen only: they reshape the picture the emulator sends and leave it, and
// every other screen, as they are. A real radar is never handled this way:
// a refused change there has to be seen as one.

import type { ControlChange, ControlValue } from './radar-api.service';

/** The brand the MaYaRa radar emulator reports. */
export const EMULATOR_BRAND = 'Emulator';

/** The controls a viewer can still set for their own screen. */
export const LOCAL_CONTROLS = new Set(['gain', 'sea', 'range']);

/** Where gain neither lifts nor sinks the picture, and where auto sits. */
const NEUTRAL = 50;
const FULL_SCALE = 100;
/** Share of the strongest echo that full gain adds, and no gain takes away */
const GAIN_LIFT = 0.4;
const GAIN_CUT = 0.8;
/** Share of the strongest echo that full sea takes off right by the boat */
const SEA_CUT_AT_BOAT = 1.6;
/** How far out, in metres, the sea's cut falls to about a third */
const SEA_CUT_RANGE = 500;
/** Zooming in further than this shows the radar's pixels as blocks */
const MAX_ZOOM = 8;

/** The changes made on this screen to a radar it may not change. */
export interface LocalView {
  radarId: string;
  controls: Map<string, ControlChange>;
}

/** How this screen reshapes the radar's echoes, as changes from what the
 *  radar was set to: fractions of the strongest echo. */
export interface SpokeAdjustment {
  gain: number;
  sea: number;
}

export const NO_ADJUSTMENT: SpokeAdjustment = { gain: 0, sea: 0 };

/** An answer that says this login may not change the radar. */
export function refusesChanges(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

/** The setting a control acts at: auto counts as the middle. */
function level(cv: ControlChange | undefined): number {
  const value = Number(cv?.value);
  return cv?.auto || !Number.isFinite(value) ? NEUTRAL : value;
}

function gainShift(gain: number): number {
  const off = gain - NEUTRAL;
  return off >= 0
    ? (off / (FULL_SCALE - NEUTRAL)) * GAIN_LIFT
    : (off / NEUTRAL) * GAIN_CUT;
}

/**
 * The ranges this screen can zoom to: the radar's own steps, up to the range
 * it sends and not so far in that its pixels show.
 */
export function zoomSteps<T extends { value: number | string }>(
  ranges: T[],
  radarRange: number
): T[] {
  return ranges.filter((o) => {
    const r = Number(o.value);
    return r <= radarRange && r * MAX_ZOOM >= radarRange;
  });
}

/**
 * The controls as this screen shows them: the radar's values, with gain and
 * sea as set here, and the range set here as far as the radar sends.
 */
export function shownControls(
  radar: Map<string, ControlValue>,
  local: Map<string, ControlChange>
): Map<string, ControlValue> {
  const shown = new Map(radar);
  local.forEach((change, id) => {
    const reported = radar.get(id);
    if (id === 'range') {
      const radarRange = Number(reported?.value);
      const value = Number(change.value);
      shown.set(id, {
        ...reported,
        value: Number.isFinite(radarRange) ? Math.min(value, radarRange) : value
      });
    } else {
      shown.set(id, { ...reported, ...change });
    }
  });
  return shown;
}

/** The gain and sea set here, as changes from what the radar was set to. A
 *  setting on auto here leaves it to the radar, and one the radar has not
 *  reported gives nothing to count from. */
export function spokeAdjustment(
  radar: Map<string, ControlValue>,
  local: Map<string, ControlChange>
): SpokeAdjustment {
  const delta = (id: string, effect: (cv: ControlChange) => number) => {
    const reported = radar.get(id);
    const change = local.get(id);
    if (!change || !reported) {
      return 0;
    }
    // as shownControls() shows it: an Auto switch alone keeps the value
    const set = { ...reported, ...change };
    return set.auto ? 0 : effect(set) - effect(reported);
  };
  return {
    gain: delta('gain', (cv) => gainShift(level(cv))),
    sea: Math.max(
      0,
      delta('sea', (cv) => level(cv) / FULL_SCALE)
    )
  };
}

/**
 * Reshapes a spoke's echoes in place. Sea can only clear more: what the
 * radar's own sea control took away does not come back.
 *
 * @param data the spoke's pixels
 * @param spokeRange metres to its last pixel
 * @param pixelColors values from here up are not echoes (Doppler, trails)
 *   and stay as they are
 */
export function adjustSpoke(
  data: Uint8Array,
  spokeRange: number,
  pixelColors: number,
  adjustment: SpokeAdjustment
) {
  const { gain, sea } = adjustment;
  if ((gain === 0 && sea === 0) || data.length === 0) {
    return;
  }
  const strongest = pixelColors - 1;
  const lift = gain * strongest;
  const seaCut = sea * SEA_CUT_AT_BOAT * strongest;
  const metresPerPixel = spokeRange / data.length;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v === 0 || v >= pixelColors) continue;
    const cut = Math.floor(
      seaCut * Math.exp((-i * metresPerPixel) / SEA_CUT_RANGE)
    );
    const shown = Math.round(v + lift) - cut;
    data[i] = shown < 1 ? 0 : Math.min(shown, strongest);
  }
}
