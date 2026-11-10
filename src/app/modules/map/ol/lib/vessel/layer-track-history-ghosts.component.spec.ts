import { describe, it, expect } from 'vitest';
import Icon from 'ol/style/Icon';
import { TrackHistoryGhostLayerComponent } from './layer-track-history-ghosts.component';
import type { TrackHistoryGhost } from 'src/app/modules/skstream/track-history.service';

// A ghost is drawn in its vessel's own icon, so a fishing vessel's ghost must
// be the fishing icon, not the sailing and pleasure craft one (#1236).
describe('TrackHistoryGhostLayerComponent icon', () => {
  function iconRequestFor(typeId?: number) {
    const requests: Array<number | string> = [];
    const c = Object.create(
      TrackHistoryGhostLayerComponent.prototype
    ) as TrackHistoryGhostLayerComponent;
    Object.assign(c, {
      mapImages: {
        getVessel: (id: number | string) => {
          requests.push(id);
          return new Icon({ src: 'vessel.svg' });
        }
      }
    });
    const ghost: TrackHistoryGhost = {
      context: 'vessels.urn:mrn:imo:mmsi:123456789',
      position: [0, 0],
      heading: 0,
      typeId
    };
    (c as unknown as { icon: (g: TrackHistoryGhost) => Icon }).icon(ghost);
    return requests[0];
  }

  it('draws a fishing vessel with the fishing icon', () => {
    expect(iconRequestFor(30)).toBe('fishing');
  });

  it('draws a dive boat with the special craft icon', () => {
    expect(iconRequestFor(34)).toBe(50);
  });

  it('keeps sailing and pleasure craft on the type 30 icon', () => {
    expect(iconRequestFor(36)).toBe(30);
    expect(iconRequestFor(37)).toBe(30);
  });

  it('uses the default icon for a vessel without a ship type', () => {
    expect(iconRequestFor(undefined)).toBe('default');
  });
});
