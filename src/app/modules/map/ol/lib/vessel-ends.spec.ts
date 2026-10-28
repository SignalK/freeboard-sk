import { describe, expect, it, vi } from 'vitest';
import { LineString } from 'ol/geom';
import { VesselEnds } from './vessel-ends';

describe('VesselEnds', () => {
  const line = () =>
    new LineString([
      [0, 0],
      [100, 100]
    ]);

  it('moves the vertex at the vessel and leaves the other end', () => {
    const ends = new VesselEnds();
    const l = line();
    ends.add(l, 0);

    ends.shiftBy([5, -3]);

    expect(l.getCoordinates()).toEqual([
      [5, -3],
      [100, 100]
    ]);
  });

  it('measures each shift from where the vessel is', () => {
    const ends = new VesselEnds();
    const l = line();
    ends.add(l, 0);

    ends.shiftBy([5, -3]);
    ends.shiftBy([2, 1]);
    ends.shiftBy([0, 0]);

    expect(l.getCoordinates()[0]).toEqual([0, 0]);
  });

  it('places a line added mid glide', () => {
    const ends = new VesselEnds();
    ends.shiftBy([5, -3]);
    const l = line();

    ends.add(l, 1);

    expect(l.getCoordinates()).toEqual([
      [0, 0],
      [105, 97]
    ]);
  });

  it('changes nothing for the same shift', () => {
    const ends = new VesselEnds();
    const l = line();
    ends.add(l, 0);
    ends.shiftBy([5, -3]);
    const changed = vi.fn();
    l.on('change', changed);

    ends.shiftBy([5, -3]);

    expect(changed).not.toHaveBeenCalled();
  });

  it('forgets cleared lines', () => {
    const ends = new VesselEnds();
    const l = line();
    ends.add(l, 0);
    ends.clear();

    ends.shiftBy([5, -3]);

    expect(l.getCoordinates()[0]).toEqual([0, 0]);
  });
});
