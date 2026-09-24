/** Map taps on recorded tracks (#821). The own trail, an AIS track and a
 * history line all run right up to their vessel, so a tap on a vessel almost
 * always lands on its track too. The vessel is what was meant: its popover
 * opens, rather than a list offering the track's recording times beside it. */

/** Feature id prefixes (up to the first '.') of vessels on the map. */
const VESSEL_PREFIXES = new Set(['vessels', 'ais-vessels']);
/** Feature id prefixes of tracks that answer a tap with recording times. */
const TRACK_TIME_PREFIXES = new Set(['trail', 'track-vessels', 'trackhistory']);

const prefix = (id: string) => id.split('.')[0];

/** The track-time entries to leave out of a tap's feature list: all of them
 * when a vessel is under the pointer, else none. */
export function trackTimesHiddenByVessel(ids: Iterable<string>): string[] {
  const all = [...ids];
  return all.some((id) => VESSEL_PREFIXES.has(prefix(id)))
    ? all.filter((id) => TRACK_TIME_PREFIXES.has(prefix(id)))
    : [];
}
