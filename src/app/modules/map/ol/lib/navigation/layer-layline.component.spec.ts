import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VectorLayer from 'ol/layer/Vector';
import { LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { LaylineComponent } from './layer-layline.component';
import { MapComponent } from '../map.component';
import { SHIFT_VESSEL_END, ShiftVesselEnd } from '../view.directive';

describe('LaylineComponent during a follow glide', () => {
  const vessel: [number, number] = [-80.5, 25.0];
  const tack: [number, number] = [-80.45, 25.02];
  const mark: [number, number] = [-80.4, 25.1];
  let layer: VectorLayer;

  beforeEach(async () => {
    const map = {
      addLayer: (l: VectorLayer) => (layer = l),
      removeLayer: vi.fn(),
      render: vi.fn()
    };
    await TestBed.configureTestingModule({
      declarations: [LaylineComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  it("moves the vessel's end of its laylines and leaves the mark's", () => {
    const fixture = TestBed.createComponent(LaylineComponent);
    fixture.componentInstance.position = vessel;
    fixture.componentInstance.lines = {
      port: [[tack, vessel]],
      starboard: [[tack, mark]]
    };
    fixture.detectChanges();
    const shiftVesselEnd = layer.get(SHIFT_VESSEL_END) as ShiftVesselEnd;

    shiftVesselEnd([40, -30]);

    const lines = layer
      .getSource()!
      .getFeatures()
      .map((f) => (f.getGeometry() as LineString).getCoordinates());
    const at = fromLonLat(vessel);
    const toMark = (l: number[][]) => l[1][0] === fromLonLat(mark)[0];
    const port = lines.find((l) => !toMark(l))!;
    const starboard = lines.find(toMark)!;
    expect(port[1][0]).toBeCloseTo(at[0] + 40);
    expect(port[1][1]).toBeCloseTo(at[1] - 30);
    expect(port[0]).toEqual(fromLonLat(tack));
    expect(starboard).toEqual([fromLonLat(tack), fromLonLat(mark)]);
  });
});
