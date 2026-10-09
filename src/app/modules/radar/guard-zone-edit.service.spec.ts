import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GuardZoneEditService } from './guard-zone-edit.service';
import { GuardZone } from './guard-zones';
import {
  ActiveRadar,
  CapabilityManifest,
  ControlValue,
  RadarAPIService
} from './radar-api.service';

describe('GuardZoneEditService', () => {
  const zoneDef = (id: number) => ({
    id,
    name: 'Guard zone',
    description: '',
    category: 'guardZones',
    dataType: 'zone',
    maxDistance: 5000
  });
  const stored: ControlValue = {
    value: 0,
    endValue: 1,
    startDistance: 100,
    endDistance: 800,
    enabled: true
  };
  const drawn: GuardZone = {
    startAngle: -0.5,
    endAngle: 0.5,
    startDistance: 200,
    endDistance: 1200,
    enabled: false
  };

  let radar: WritableSignal<ActiveRadar>;
  let setControl: ReturnType<typeof vi.fn>;
  let service: GuardZoneEditService;

  const makeRadar = (
    id: string,
    values: Record<string, ControlValue>
  ): ActiveRadar => ({
    device: { id, name: id, brand: 'Furuno' },
    capabilities: {
      controls: { guardZone1: zoneDef(16), guardZone2: zoneDef(17) }
    } as unknown as CapabilityManifest,
    controls: new Map(Object.entries(values))
  });
  const report = (controlId: string, value: ControlValue) =>
    radar.update((r) => ({
      ...r,
      controls: new Map(r.controls).set(controlId, value)
    }));
  const shown = (id: string) => service.zones().find((z) => z.id === id)?.zone;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    radar = signal(
      makeRadar('fur6424A', {
        guardZone1: stored,
        guardZone2: { value: 0, endValue: 0, startDistance: 0, endDistance: 0 }
      })
    );
    setControl = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: RadarAPIService, useValue: { radar, setControl } }]
    });
    service = TestBed.inject(GuardZoneEditService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows the zone being drawn in place of the stored one', () => {
    service.draw('guardZone1');
    expect(shown('guardZone1').endDistance).toBe(800);
    service.update(drawn);
    expect(shown('guardZone1')).toEqual(drawn);
  });

  it('shows a zone drawn where the radar holds none', () => {
    expect(shown('guardZone2')).toBeUndefined();
    service.draw('guardZone2');
    service.update(drawn);
    expect(shown('guardZone2')).toEqual(drawn);
  });

  it('arms a drawn zone and goes on to edit it', () => {
    service.draw('guardZone2');
    service.drawn(drawn);
    expect(service.edit().mode).toBe('edit');
    expect(service.edit().zone.enabled).toBe(true);
  });

  it('saves the whole zone in one change, within the radar reach', async () => {
    service.editZone('guardZone1');
    service.update({ ...drawn, endDistance: 9000 });
    await service.save();
    expect(setControl).toHaveBeenCalledTimes(1);
    expect(setControl).toHaveBeenCalledWith('fur6424A', 'guardZone1', {
      value: -0.5,
      endValue: 0.5,
      startDistance: 200,
      endDistance: 5000,
      enabled: false
    });
    expect(service.edit()).toBeUndefined();
  });

  it('keeps showing a saved zone until the radar reports it', async () => {
    service.editZone('guardZone1');
    service.update(drawn);
    await service.save();
    expect(shown('guardZone1')).toEqual(drawn);

    report('guardZone1', {
      value: drawn.startAngle,
      endValue: drawn.endAngle,
      startDistance: drawn.startDistance,
      endDistance: drawn.endDistance,
      enabled: drawn.enabled
    });
    TestBed.tick();
    // the radar's own value is shown from now on
    report('guardZone1', stored);
    expect(shown('guardZone1').endDistance).toBe(800);
  });

  it('stops showing a saved zone the radar never reports back', async () => {
    service.editZone('guardZone1');
    service.update(drawn);
    await service.save();
    vi.advanceTimersByTime(5000);
    expect(shown('guardZone1').endDistance).toBe(800);
  });

  it('shows the stored zone again when saving fails', async () => {
    setControl.mockRejectedValueOnce(new Error('rejected'));
    service.editZone('guardZone1');
    service.update(drawn);
    await expect(service.save()).rejects.toThrow('rejected');
    expect(shown('guardZone1').endDistance).toBe(800);
  });

  it('arms and disarms the stored zone', async () => {
    await service.setEnabled('guardZone1', false);
    expect(setControl).toHaveBeenCalledWith('fur6424A', 'guardZone1', {
      value: 0,
      endValue: 1,
      startDistance: 100,
      endDistance: 800,
      enabled: false
    });
  });

  it('clears a zone to the value of a zone never set', async () => {
    await service.clear('guardZone1');
    expect(setControl).toHaveBeenCalledWith('fur6424A', 'guardZone1', {
      value: 0,
      endValue: 0,
      startDistance: 0,
      endDistance: 0,
      enabled: false
    });
  });

  it('ends the edit when another radar is picked', () => {
    service.editZone('guardZone1');
    radar.set(makeRadar('fur6424B', { guardZone1: stored }));
    TestBed.tick();
    expect(service.edit()).toBeUndefined();
  });
});
