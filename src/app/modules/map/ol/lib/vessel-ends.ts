import type { Coordinate as MercatorCoordinate } from 'ol/coordinate';
import type { LineString } from 'ol/geom';
import type { ShiftVesselEnd } from './view.directive';

interface VesselEnd {
  line: LineString;
  index: number;
  at: MercatorCoordinate;
}

/**
 * The vertices of a layer's lines that are drawn at the vessel the view
 * follows, moved by the rest of a follow glide (ViewDirective) so the line
 * stays on the vessel while its other end stays on the chart.
 */
export class VesselEnds {
  private ends: VesselEnd[] = [];
  private shift: MercatorCoordinate = [0, 0];

  clear() {
    this.ends = [];
  }

  /** Mark the vertex at `index` of `line` as drawn at the vessel. */
  add(line: LineString, index: number) {
    const at = line.getCoordinates()[index];
    if (at) {
      this.ends.push({ line, index, at });
      this.place(this.ends[this.ends.length - 1]);
    }
  }

  readonly shiftBy: ShiftVesselEnd = (shift) => {
    if (shift[0] === this.shift[0] && shift[1] === this.shift[1]) {
      return;
    }
    this.shift = shift;
    for (const end of this.ends) {
      this.place(end);
    }
  };

  private place(end: VesselEnd) {
    const coordinates = end.line.getCoordinates();
    coordinates[end.index] = [
      end.at[0] + this.shift[0],
      end.at[1] + this.shift[1],
      ...end.at.slice(2)
    ];
    end.line.setCoordinates(coordinates);
  }
}
