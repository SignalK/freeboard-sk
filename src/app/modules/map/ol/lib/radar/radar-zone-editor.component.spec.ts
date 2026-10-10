import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapBrowserEvent } from 'ol';
import PointerInteraction from 'ol/interaction/Pointer';
import { fromLonLat } from 'ol/proj';
import { RadarZoneEditorComponent } from './radar-zone-editor.component';
import { MapComponent } from '../map.component';
import { GuardZone } from 'src/app/modules/radar/guard-zones';
import { fromRadarPolar } from 'src/app/modules/radar/guard-zone-edit';
import { ZoneEdit } from 'src/app/modules/radar/guard-zone-edit.service';

describe('RadarZoneEditorComponent', () => {
  const position: [number, number] = [5, 52];
  const stored: GuardZone = {
    startAngle: -0.5,
    endAngle: 0.5,
    startDistance: 200,
    endDistance: 1000,
    enabled: true
  };

  let interaction: PointerInteraction;
  let handleAtPointer: string | undefined;
  let changes: GuardZone[];
  let drawn: GuardZone[];

  const target = document.createElement('div');
  const map = {
    getTargetElement: () => target,
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    addInteraction: (i: PointerInteraction) => (interaction = i),
    removeInteraction: vi.fn(),
    forEachFeatureAtPixel: (
      _pixel: number[],
      callback: (f: { get: () => string }) => string
    ) =>
      handleAtPointer ? callback({ get: () => handleAtPointer }) : undefined
  };

  function open(edit: ZoneEdit) {
    const fixture = TestBed.createComponent(RadarZoneEditorComponent);
    fixture.componentRef.setInput('edit', edit);
    fixture.componentRef.setInput('position', position);
    fixture.componentRef.setInput('heading', 0);
    fixture.componentRef.setInput('zIndex', 1000);
    fixture.componentInstance.zoneChange.subscribe((z) => changes.push(z));
    fixture.componentInstance.zoneDrawn.subscribe((z) => drawn.push(z));
    fixture.detectChanges();
    return fixture;
  }

  /** A pointer event at a bearing from the bow and a distance in metres,
   *  `pixel` standing in for where it is on the screen. */
  function pointer(
    type: 'pointerdown' | 'pointerdrag' | 'pointerup',
    angle: number,
    distance: number,
    pixel: number[],
    pointerId = 1
  ): boolean {
    const e = {
      type,
      map,
      pixel,
      coordinate: fromLonLat(
        fromRadarPolar(position, 0, { angle, distance }) as number[]
      ),
      originalEvent: { pointerId, preventDefault: () => undefined }
    } as unknown as MapBrowserEvent;
    // false: the event goes no further, so the map does not pan
    return interaction.handleEvent(e);
  }

  beforeEach(async () => {
    handleAtPointer = undefined;
    changes = [];
    drawn = [];
    await TestBed.configureTestingModule({
      declarations: [RadarZoneEditorComponent],
      providers: [{ provide: MapComponent, useValue: { getMap: () => map } }]
    }).compileComponents();
  });

  describe('drawing', () => {
    const edit: ZoneEdit = {
      radarId: 'fur6424A',
      controlId: 'guardZone1',
      mode: 'draw',
      zone: stored
    };

    it('shows a crosshair over the chart until the drawing ends', () => {
      const fixture = open(edit);
      expect(target.style.cursor).toBe('crosshair');
      fixture.componentRef.setInput('edit', { ...edit, mode: 'edit' });
      fixture.detectChanges();
      expect(target.style.cursor).toBe('');
      fixture.componentRef.setInput('edit', edit);
      fixture.detectChanges();
      fixture.destroy();
      expect(target.style.cursor).toBe('');
    });

    it('takes the drag from the map, so the chart does not pan', () => {
      open(edit);
      expect(pointer('pointerdown', -0.2, 300, [100, 100])).toBe(false);
    });

    it('draws a zone from corner to corner, reported once', () => {
      open(edit);
      pointer('pointerdown', -0.2, 300, [100, 100]);
      pointer('pointerdrag', 0, 600, [140, 60]);
      pointer('pointerdrag', 0.2, 900, [180, 20]);
      pointer('pointerup', 0.2, 900, [180, 20]);

      expect(changes.length).toBe(2);
      expect(drawn.length).toBe(1);
      expect(drawn[0].startAngle).toBeCloseTo(-0.2);
      expect(drawn[0].endAngle).toBeCloseTo(0.2);
      expect(drawn[0].startDistance).toBeCloseTo(300, 0);
      expect(drawn[0].endDistance).toBeCloseTo(900, 0);
    });

    it('takes a tap for a tap, not a zone', () => {
      open(edit);
      pointer('pointerdown', -0.2, 300, [100, 100]);
      pointer('pointerdrag', -0.2, 301, [103, 102]);
      pointer('pointerup', -0.2, 301, [103, 102]);

      expect(changes).toEqual([]);
      expect(drawn).toEqual([]);
    });

    it('puts the zone back when a second finger joins', () => {
      open(edit);
      pointer('pointerdown', -0.2, 300, [100, 100]);
      pointer('pointerdrag', 0.2, 900, [180, 20]);
      pointer('pointerdrag', 0.4, 700, [220, 40], 2);
      pointer('pointerdrag', 0.3, 950, [190, 10]);
      pointer('pointerup', 0.3, 950, [190, 10]);

      expect(changes.at(-1)).toBe(stored);
      expect(drawn).toEqual([]);
    });
  });

  describe('editing', () => {
    const edit: ZoneEdit = {
      radarId: 'fur6424A',
      controlId: 'guardZone1',
      mode: 'edit',
      zone: stored
    };

    it('leaves the chart to pan away from the handles', () => {
      open(edit);
      expect(pointer('pointerdown', 0, 600, [100, 100])).toBe(true);
      pointer('pointerdrag', 0, 1500, [100, 40]);
      expect(changes).toEqual([]);
    });

    it('moves the handle under the finger', () => {
      open(edit);
      handleAtPointer = 'outerDist';
      expect(pointer('pointerdown', 0, 1000, [100, 100])).toBe(false);
      pointer('pointerdrag', 0, 1500, [100, 40]);
      pointer('pointerup', 0, 1500, [100, 40]);

      expect(changes.length).toBe(1);
      expect(changes[0].endDistance).toBeCloseTo(1500, 0);
      expect(changes[0].startDistance).toBe(stored.startDistance);
      expect(drawn).toEqual([]);
    });

    it('puts the zone back when a second finger joins', () => {
      open(edit);
      handleAtPointer = 'outerDist';
      pointer('pointerdown', 0, 1000, [100, 100]);
      pointer('pointerdrag', 0, 1500, [100, 40]);
      pointer('pointerup', 0.4, 700, [220, 40], 2);

      expect(changes.at(-1)).toBe(stored);
    });
  });
});
