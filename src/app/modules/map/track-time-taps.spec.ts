import { describe, expect, it } from 'vitest';
import { trackTimesHiddenByVessel } from './track-time-taps';

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
