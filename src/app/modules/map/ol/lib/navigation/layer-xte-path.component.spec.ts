import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineString } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { Style } from 'ol/style';
import { XTEPathComponent } from './layer-xte-path.component';
import { MapComponent } from '../map.component';
import { destinationStyles } from '../../../mapconfig';

// A go-to keeps its course line where the course started, as plotters do, and
// the line from the vessel is only the direct bearing beside it.
describe('XTEPathComponent course line', () => {
  const start: [number, number] = [178.4, -18.1];
  const dest: [number, number] = [178.6, -17.9];

  const map = {
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    render: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [XTEPathComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  function open() {
    const fixture = TestBed.createComponent(XTEPathComponent);
    fixture.componentRef.setInput('startPosition', start);
    fixture.componentRef.setInput('destPosition', dest);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function widest(style: Style | Style[]): number {
    const styles = Array.isArray(style) ? style : [style];
    return Math.max(...styles.map((s) => s.getStroke()?.getWidth() ?? 0));
  }

  it('runs from the start of the course to the destination', () => {
    const line = open().source?.getFeatures()[0].getGeometry() as LineString;
    const [a, b] = line.getCoordinates().map((c) => toLonLat(c));
    expect(a[0]).toBeCloseTo(start[0]);
    expect(a[1]).toBeCloseTo(start[1]);
    expect(b[0]).toBeCloseTo(dest[0]);
    expect(b[1]).toBeCloseTo(dest[1]);
  });

  it('is drawn solid and heavier than the bearing from the vessel', () => {
    const style = open().buildStyle();
    const styles = Array.isArray(style) ? style : [style];
    expect(styles.every((s) => !s.getStroke()?.getLineDash())).toBe(true);
    expect(widest(style)).toBeGreaterThan(widest(destinationStyles.line));
    expect(destinationStyles.line.getStroke()?.getLineDash()).toBeTruthy();
  });
});
