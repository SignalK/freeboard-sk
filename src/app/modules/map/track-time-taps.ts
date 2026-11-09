/** Map taps on recorded tracks (#821). The own trail, an AIS track and a
 * history line all run right up to their vessel, so a tap on a vessel almost
 * always lands on its track too. The vessel is what was meant: its popover
 * opens, rather than a list offering the track's recording times beside it. */

import { Position } from 'src/app/types';
import {
  joinStretches,
  PointTime,
  TimedTrack,
  TRAIL_JOIN_GAP_MS
} from 'src/app/modules/skstream/track-history';

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

/** What a tap on the own trail is answered from: the local trail, carrying on
 * from the server trail — but the server trail only while it is the one
 * drawn. After switching to this device's trail, its times would otherwise
 * still be searched, and answer a tap on today's trail with yesterday's.
 * Joined to the server trail, which is thinned, the local trail is broken
 * where it went quiet: in a thinned track only a new line marks a gap. */
export function trailTapTrack(
  server: TimedTrack | null,
  serverShown: boolean,
  local: TimedTrack
): TimedTrack {
  return serverShown && server
    ? joinStretches(server, splitAtGaps(local))
    : joinStretches({ lines: [], times: [] }, local);
}

const timeMs = (t: PointTime) => (t ? Date.parse(t) : NaN);

/** `track` with a line broken wherever the recording went quiet for longer
 * than {@link TRAIL_JOIN_GAP_MS}. */
function splitAtGaps(track: TimedTrack): TimedTrack {
  const lines: Position[][] = [];
  const times: PointTime[][] = [];
  track.lines.forEach((line, i) => {
    const lineTimes = track.times[i] ?? [];
    let from = 0;
    for (let j = 1; j <= line.length; j++) {
      if (
        j === line.length ||
        timeMs(lineTimes[j]) - timeMs(lineTimes[j - 1]) > TRAIL_JOIN_GAP_MS
      ) {
        lines.push(line.slice(from, j));
        times.push(lineTimes.slice(from, j));
        from = j;
      }
    }
  });
  return { lines, times };
}
