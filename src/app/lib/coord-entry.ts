import proj4 from 'proj4';

/**
 * Typed position entry: the notations a skipper may read a position in
 * (a pilot book, a paper chart, a GPS, a list from a race committee).
 */
export type CoordEntryFormat = 'DD' | 'DDM' | 'DMS' | 'UTM';
export type CoordAxis = 'lat' | 'lon';

export const COORD_ENTRY_FORMATS: ReadonlyArray<{
  id: CoordEntryFormat;
  label: string;
  description: string;
}> = [
  { id: 'DD', label: 'Latitude / Longitude', description: 'Decimal degrees' },
  { id: 'DDM', label: "DD° MM.MMM'", description: 'Degrees, decimal minutes' },
  {
    id: 'DMS',
    label: `DD° MM' SS.SS"`,
    description: 'Degrees, minutes, seconds'
  },
  { id: 'UTM', label: 'UTM', description: 'UTM zone, easting, northing' }
];

/** The entry notation closest to the user's position display format. */
export function entryFormatFor(positionFormat: string): CoordEntryFormat {
  switch (positionFormat) {
    case 'DMdH':
      return 'DDM';
    case 'HDMS':
    case 'DHMS':
      return 'DMS';
    default:
      return 'DD';
  }
}

const AXIS_LIMIT: Record<CoordAxis, number> = { lat: 90, lon: 180 };
export const HEMISPHERES: Record<CoordAxis, { pos: string; neg: string }> = {
  lat: { pos: 'N', neg: 'S' },
  lon: { pos: 'E', neg: 'W' }
};

// Up to three numbers (degrees, minutes, seconds) separated by whitespace,
// ':' or the degree / minute / second marks a keyboard or a copy-paste yields.
const MARKS = `\\s°º˚'′’"″:`;
const ANGLE_BODY = new RegExp(
  `^\\d+(?:\\.\\d+)?(?:[${MARKS}]+\\d+(?:\\.\\d+)?){0,2}[${MARKS}]*$`
);

/**
 * Parse a typed latitude or longitude into signed decimal degrees.
 *
 * The notation is recognised from the number of parts, so a value is accepted
 * whichever format is selected: `47.6375`, `47 38.25`, `47°38'15"` all read the
 * same. The hemisphere comes from a leading `-` or an N/S (E/W) letter at
 * either end; a comma between digits is a decimal separator.
 *
 * @returns degrees, or `null` when the text is not a valid position on `axis`
 */
export function parseAngle(text: string, axis: CoordAxis): number | null {
  let s = (text ?? '')
    .trim()
    .toUpperCase()
    .replace(/(\d),(\d)/g, '$1.$2');
  if (!s) {
    return null;
  }

  const { pos, neg } = HEMISPHERES[axis];
  let negative = false;
  let hemisphere: string | null = null;
  const lead = s.match(/^([A-Z])\s*/);
  const trail = s.match(/\s*([A-Z])$/);
  if (lead) {
    hemisphere = lead[1];
    s = s.slice(lead[0].length);
  } else if (trail) {
    hemisphere = trail[1];
    s = s.slice(0, s.length - trail[0].length);
  }
  if (hemisphere !== null) {
    if (hemisphere !== pos && hemisphere !== neg) {
      return null;
    }
    negative = hemisphere === neg;
  }

  const sign = s.match(/^([+-])\s*/);
  if (sign) {
    // "-47 N" contradicts itself; refuse rather than guess.
    if (hemisphere !== null) {
      return null;
    }
    negative = sign[1] === '-';
    s = s.slice(sign[0].length);
  }

  if (!ANGLE_BODY.test(s)) {
    return null;
  }
  const parts = (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  // Only the last part may carry a fraction, and minutes/seconds stay below 60.
  for (let i = 0; i < parts.length; i++) {
    if (i < parts.length - 1 && !Number.isInteger(parts[i])) {
      return null;
    }
    if (i > 0 && parts[i] >= 60) {
      return null;
    }
  }
  const [d, m = 0, sec = 0] = parts;
  const value = d + m / 60 + sec / 3600;
  if (value > AXIS_LIMIT[axis]) {
    return null;
  }
  return negative && value !== 0 ? -value : value;
}

/**
 * Format decimal degrees as editable text in the given notation, so that
 * `parseAngle` reads it back.
 *
 * Every notation writes the hemisphere as N/S or E/W, as charts and GPS
 * units show a position. Precision is ~0.1 m for DD, ~2 m for DDM (the usual
 * MM.MMM') and ~0.3 m for DMS. Rounding is done on the smallest unit so a
 * carry rolls into the next part (never 60').
 */
export function formatAngle(
  value: number,
  format: Exclude<CoordEntryFormat, 'UTM'>,
  axis: CoordAxis
): string {
  return `${formatMagnitude(value, format)} ${hemisphereOf(value, axis)}`;
}

/** The N/S or E/W letter of a signed value; 0 counts as N or E. */
export function hemisphereOf(value: number, axis: CoordAxis): string {
  const { pos, neg } = HEMISPHERES[axis];
  return value < 0 ? neg : pos;
}

/** True when the text gives its own direction: a sign or a letter. */
export function namesDirection(text: string): boolean {
  return /^\s*[+-]|[A-Z]/i.test(text ?? '');
}

/** The text without the sign or hemisphere letter it may carry. */
export function withoutDirection(text: string): string {
  return (text ?? '').replace(/^\s*[+-]|[A-Z]/gi, '').trim();
}

/** `formatAngle` without the hemisphere: the unsigned value only. */
export function formatMagnitude(
  value: number,
  format: Exclude<CoordEntryFormat, 'UTM'>
): string {
  const abs = Math.abs(value);
  if (format === 'DD') {
    return `${Number(abs.toFixed(6))}°`;
  }

  if (format === 'DDM') {
    const scale = 1000; // units of 1/1000 minute
    const total = Math.round(abs * 60 * scale);
    const deg = Math.floor(total / (60 * scale));
    const min = (total - deg * 60 * scale) / scale;
    return `${deg}° ${min.toFixed(3).padStart(6, '0')}'`;
  }

  const scale = 100; // units of 1/100 second
  const total = Math.round(abs * 3600 * scale);
  const deg = Math.floor(total / (3600 * scale));
  const min = Math.floor((total - deg * 3600 * scale) / (60 * scale));
  const sec = (total - deg * 3600 * scale - min * 60 * scale) / scale;
  return `${deg}° ${String(min).padStart(2, '0')}' ${sec
    .toFixed(2)
    .padStart(5, '0')}"`;
}

const PART_SYMBOLS = ['°', "'", '"'];
const PART_COUNT: Record<Exclude<CoordEntryFormat, 'UTM'>, number> = {
  DD: 1,
  DDM: 2,
  DMS: 3
};
const PART_DECIMALS: Record<Exclude<CoordEntryFormat, 'UTM'>, number> = {
  DD: 6,
  DDM: 3,
  DMS: 2
};
// What a user may type to close a part early, e.g. "5 " for 5°.
const PART_SEPARATORS = ` °º˚'′’"″:`;

export interface MaskedAngle {
  /** The text laid out in the notation, with its marks and spaces. */
  text: string;
  /** Where the caret goes in `text`. */
  caret: number;
  /** A hemisphere typed into the text: true for S or W (or `-`), false for
   *  N or E (or `+`), null when none was typed. It is not kept in `text`,
   *  unless it is wrong for the axis or contradicts itself (`47E` for a
   *  latitude, `-47N`): it then stays in `text`, which no longer parses, and
   *  this is null. */
  negative: boolean | null;
}

/**
 * Lay typed text out in a notation as the user types, so they type digits
 * only: `4738250` becomes `47° 38.250'` in DD° MM.MMM'.
 *
 * Digits fill degrees, minutes and seconds in turn. A part moves on once it
 * is full (2 degree digits for a latitude, 3 for a longitude, 2 for minutes
 * and seconds) or when a space or mark is typed, so `5 3` gives `5° 3'`.
 * Digits past the last part become its decimals, and a `.` or `,` starts
 * them. Marks are rebuilt each time, so typing one is never needed and never
 * doubles it. A hemisphere letter or sign is taken out and reported, but a
 * wrong or contradictory one is kept so the field shows it as an error.
 *
 * `deleting` is set for a deletion: a trailing space the user just erased is
 * then not put back.
 */
export function maskAngle(
  raw: string,
  caret: number,
  format: Exclude<CoordEntryFormat, 'UTM'>,
  axis: CoordAxis,
  deleting = false
): MaskedAngle {
  const parts = PART_COUNT[format];
  const widths = [axis === 'lat' ? 2 : 3, 2, 2];
  const { pos, neg } = HEMISPHERES[axis];
  const ints = [''];
  let frac: string | null = null;
  // Whether the decimal point is in the typed text, or was put there by a
  // digit overflowing the last part: only a typed one moves the caret.
  let pointTyped = false;
  let sign: '+' | '-' | null = null;
  let letters = '';
  let kept = 0;
  let keptBeforeCaret = 0;

  const text = (raw ?? '').toUpperCase();
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    const cur = ints.length - 1;
    const last = cur === parts - 1;
    let keep = false;
    if (c >= '0' && c <= '9') {
      if (frac !== null) {
        if (frac.length < PART_DECIMALS[format]) {
          frac += c;
          keep = true;
        }
      } else if (ints[cur].length < widths[cur]) {
        ints[cur] += c;
        keep = true;
      } else if (!last) {
        ints.push(c);
        keep = true;
      } else {
        frac = c;
        keep = true;
      }
    } else if (c === '.' || c === ',') {
      if (last && frac === null && ints[cur] !== '') {
        frac = '';
        pointTyped = true;
        keep = true;
      }
    } else if (PART_SEPARATORS.includes(c)) {
      // A mark closes the part only when a digit comes after it: the mark
      // the layout itself puts after the digits must not. A space typed at
      // the end does, so "5 " moves on to the minutes.
      const closes = c === ' ' || /\d/.test(text.slice(k + 1));
      if (closes && !last && ints[cur] !== '') {
        ints.push('');
      }
    } else if (c === '-' || c === '+') {
      sign = c;
    } else if (c >= 'A' && c <= 'Z') {
      letters += c;
    }
    if (keep) {
      kept++;
      if (k < caret) {
        keptBeforeCaret++;
      }
    }
  }

  // An empty part at the end means a separator was typed: show it ("5° ")
  // unless the user is erasing it.
  let open = ints.length > 1 && ints[ints.length - 1] === '';
  if (open && deleting) {
    ints.pop();
    open = false;
  }

  let out = '';
  const after = [0]; // after[n]: index just past the n-th kept character
  ints.forEach((part, p) => {
    if (p > 0) {
      out += ' ';
    }
    for (const ch of part) {
      out += ch;
      after.push(out.length);
    }
    const hasFrac = p === parts - 1 && frac !== null;
    if (hasFrac) {
      out += '.';
      if (pointTyped) {
        after.push(out.length);
      }
      for (const ch of frac as string) {
        out += ch;
        after.push(out.length);
      }
    }
    if (part !== '' || hasFrac) {
      out += PART_SYMBOLS[p];
    }
  });

  const at =
    open && keptBeforeCaret === kept ? out.length : after[keptBeforeCaret];

  // Every direction given must agree, and every letter must belong to the
  // axis. Dropping a wrong one would quietly save another position.
  const named = [
    ...(sign ? [sign === '-'] : []),
    ...[...letters].map((l) => (l === neg ? true : l === pos ? false : null))
  ];
  const conflict =
    named.includes(null) || (named.includes(true) && named.includes(false));
  if (conflict) {
    const prefix = sign && letters.length ? sign : '';
    const shown = `${prefix}${out} ${letters}`.trimEnd();
    return {
      text: shown,
      caret: caret >= text.length ? shown.length : at + prefix.length,
      negative: null
    };
  }
  return {
    text: out,
    caret: at,
    negative: named.length ? (named[named.length - 1] as boolean) : null
  };
}

/**
 * Remove the digit (or decimal point) just before `caret`. Erasing a mark or
 * space alone changes nothing once the text is laid out again, so a deletion
 * that only hit one of them takes the digit before it instead.
 */
export function dropDigitBefore(
  text: string,
  caret: number
): { text: string; caret: number } {
  for (let k = Math.min(caret, text.length) - 1; k >= 0; k--) {
    if (/[\d.]/.test(text[k])) {
      return { text: text.slice(0, k) + text.slice(k + 1), caret: k };
    }
  }
  return { text, caret };
}

export interface UtmPosition {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
}

/** UTM is defined from 80°S to 84°N; beyond that UPS applies. */
export const UTM_LAT_MIN = -80;
export const UTM_LAT_MAX = 84;
// About a metre of latitude. A position on a band limit, shown with its
// easting and northing rounded to whole metres, can read back just past it.
const UTM_LAT_SLACK = 1e-5;

const utmDef = (zone: number, hemisphere: 'N' | 'S') =>
  `+proj=utm +zone=${zone}${hemisphere === 'S' ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`;

/** The UTM zone a position falls in, including the Norway and Svalbard exceptions. */
export function utmZoneFor(lon: number, lat: number): number {
  const zone = Math.min(60, Math.floor((lon + 180) / 6) + 1);
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) {
    return 32;
  }
  if (lat >= 72 && lat < 84 && lon >= 0 && lon < 42) {
    if (lon < 9) return 31;
    if (lon < 21) return 33;
    if (lon < 33) return 35;
    return 37;
  }
  return zone;
}

/** Convert WGS84 lon/lat to UTM, or `null` outside the UTM latitude band. */
export function toUtm(lon: number, lat: number): UtmPosition | null {
  if (lat < UTM_LAT_MIN || lat > UTM_LAT_MAX) {
    return null;
  }
  const zone = utmZoneFor(lon, lat);
  const hemisphere = lat < 0 ? 'S' : 'N';
  const [easting, northing] = proj4('WGS84', utmDef(zone, hemisphere), [
    lon,
    lat
  ]);
  return { zone, hemisphere, easting, northing };
}

/**
 * Convert UTM to WGS84 `[lon, lat]`, longitude normalised to [-180, 180].
 * Returns `null` when the input is out of range for UTM.
 */
export function fromUtm(utm: UtmPosition): [number, number] | null {
  const { zone, hemisphere, easting, northing } = utm;
  if (
    !Number.isInteger(zone) ||
    zone < 1 ||
    zone > 60 ||
    (hemisphere !== 'N' && hemisphere !== 'S') ||
    !Number.isFinite(easting) ||
    !Number.isFinite(northing) ||
    easting <= 0 ||
    easting >= 1_000_000 ||
    northing < 0 ||
    northing > 10_000_000
  ) {
    return null;
  }
  const [lon, lat] = proj4(utmDef(zone, hemisphere), 'WGS84', [
    easting,
    northing
  ]);
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    lat < UTM_LAT_MIN - UTM_LAT_SLACK ||
    lat > UTM_LAT_MAX + UTM_LAT_SLACK
  ) {
    return null;
  }
  return [
    ((((lon + 180) % 360) + 360) % 360) - 180,
    Math.min(UTM_LAT_MAX, Math.max(UTM_LAT_MIN, lat))
  ];
}
