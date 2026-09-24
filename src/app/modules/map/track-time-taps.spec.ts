import { describe, expect, it } from 'vitest';
import { trackTimesHiddenByVessel, trailTapTrack } from './track-time-taps';

describe('trackTimesHiddenByVessel', () => {
  it('leaves track times out when a vessel is under the pointer', () => {
    expect(
      trackTimesHiddenByVessel([
        'vessels.urn:mrn:signalk:uuid:self',
        'trail.self.server',
        'trackhistory.3'
      ])
    ).toEqual(['trail.self.server', 'trackhistory.3']);
    expect(
      trackTimesHiddenByVessel([
        'ais-vessels.urn:mrn:imo:mmsi:366000011',
        'track-vessels.urn:mrn:imo:mmsi:366000011'
      ])
    ).toEqual(['track-vessels.urn:mrn:imo:mmsi:366000011']);
  });

  it('keeps them for a tap on a track alone, or beside other features', () => {
    expect(trackTimesHiddenByVessel(['trail.self.server'])).toEqual([]);
    expect(
      trackTimesHiddenByVessel(['trackhistory.1', 'waypoint.abc'])
    ).toEqual([]);
  });
});

describe('trailTapTrack', () => {
  const server = {
    lines: [
      [
        [0, 0],
        [1, 0]
      ] as [number, number][]
    ],
    times: [['2026-09-23T10:00:00Z', '2026-09-23T10:05:00Z']]
  };
  const local = {
    lines: [
      [
        [0.5, 0.001],
        [0.6, 0.001]
      ] as [number, number][]
    ],
    times: [['2026-09-24T10:00:00Z', '2026-09-24T10:00:05Z']]
  };

  it('answers from the server trail too while it is drawn', () => {
    expect(trailTapTrack(server, true, local).lines).toHaveLength(2);
  });

  it("leaves out a server trail that isn't drawn", () => {
    expect(trailTapTrack(server, false, local)).toEqual(local);
    expect(trailTapTrack(null, true, local)).toEqual(local);
  });
});
