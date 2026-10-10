import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { RadarAPIService } from './radar-api.service';
import {
  GuardZone,
  guardZoneFromControl,
  radarGuardZones,
  RadarGuardZone
} from './guard-zones';
import { limitZone, zoneControlValue } from './guard-zone-edit';

/** A guard zone being drawn or edited on the chart. While drawing, `zone` is
 *  the zone the radar holds until the user drags out a new one. */
export interface ZoneEdit {
  radarId: string;
  controlId: string;
  mode: 'draw' | 'edit';
  zone: GuardZone | undefined;
}

interface PendingZone {
  radarId: string;
  controlId: string;
  zone: GuardZone;
}

// how long a saved zone is shown before the radar reports it back, so a
// radar that adjusts the value it stores does not leave the edit up
const PENDING_TIMEOUT = 5000;
const ANGLE_MATCH = 0.001;
const DISTANCE_MATCH = 0.5;

// The value of a zone that was never set, as the MaYaRa radar starts with it.
const CLEARED_ZONE: GuardZone = {
  startAngle: 0,
  endAngle: 0,
  startDistance: 0,
  endDistance: 0,
  enabled: false
};

function sameZone(a: GuardZone | undefined, b: GuardZone): boolean {
  return (
    !!a &&
    a.enabled === b.enabled &&
    Math.abs(a.startAngle - b.startAngle) < ANGLE_MATCH &&
    Math.abs(a.endAngle - b.endAngle) < ANGLE_MATCH &&
    Math.abs(a.startDistance - b.startDistance) < DISTANCE_MATCH &&
    Math.abs(a.endDistance - b.endDistance) < DISTANCE_MATCH
  );
}

/**
 * Drawing and editing the guard zones of the selected radar. The radar holds
 * the zones; this keeps only the zone being edited, and a saved zone until
 * the radar reports it back, so the chart does not jump back to the old one
 * in between.
 */
@Injectable({ providedIn: 'root' })
export class GuardZoneEditService {
  private radarApi = inject(RadarAPIService);

  private _edit = signal<ZoneEdit | undefined>(undefined);
  readonly edit = this._edit.asReadonly();
  private pending = signal<PendingZone | undefined>(undefined);
  private pendingTimer: ReturnType<typeof setTimeout>;

  /** The zones to draw: the radar's, with the edited or just saved zone in
   *  place of its stored value. */
  readonly zones = computed<RadarGuardZone[]>(() => {
    const radar = this.radarApi.radar();
    const id = radar?.device?.id;
    const zones = radarGuardZones(radar);
    const edit = this._edit();
    const pending = this.pending();
    const override =
      edit?.radarId === id && edit.zone
        ? { id: edit.controlId, zone: edit.zone }
        : pending?.radarId === id
          ? { id: pending.controlId, zone: pending.zone }
          : undefined;
    if (!override) {
      return zones;
    }
    return [...zones.filter((z) => z.id !== override.id), override].sort(
      (a, b) => a.id.localeCompare(b.id)
    );
  });

  constructor() {
    effect(() => {
      const pending = this.pending();
      const radar = this.radarApi.radar();
      if (
        pending &&
        (radar?.device?.id !== pending.radarId ||
          sameZone(
            guardZoneFromControl(radar.controls?.get(pending.controlId)),
            pending.zone
          ))
      ) {
        this.clearPending();
      }
    });
    effect(() => {
      // a radar picked in the panel ends the edit of another radar's zone
      const id = this.radarApi.radar()?.device?.id;
      const edit = this._edit();
      if (edit && edit.radarId !== id) {
        this._edit.set(undefined);
      }
    });
  }

  /** The stored zone of a guard zone control of the selected radar. */
  storedZone(controlId: string): GuardZone | undefined {
    return guardZoneFromControl(
      this.radarApi.radar()?.controls?.get(controlId)
    );
  }

  /** Start drawing a zone: the next drag on the chart replaces it. */
  draw(controlId: string) {
    this.start(controlId, 'draw');
  }

  /** Start editing a zone through its handles on the chart. */
  editZone(controlId: string) {
    this.start(controlId, 'edit');
  }

  private start(controlId: string, mode: ZoneEdit['mode']) {
    const radarId = this.radarApi.radar()?.device?.id;
    if (!radarId) {
      return;
    }
    const current = this._edit();
    const zone =
      current?.controlId === controlId && current.radarId === radarId
        ? current.zone
        : this.storedZone(controlId);
    this._edit.set({ radarId, controlId, mode, zone });
  }

  /** Replace the edited zone, e.g. while a handle is dragged. */
  update(zone: GuardZone) {
    this._edit.update((e) => (e ? { ...e, zone } : e));
  }

  /** A drawn zone is armed and goes on to be adjusted through its handles. */
  drawn(zone: GuardZone) {
    this._edit.update((e) =>
      e ? { ...e, mode: 'edit', zone: { ...zone, enabled: true } } : e
    );
  }

  cancel() {
    this._edit.set(undefined);
  }

  /** Send the edited zone to the radar in one change. */
  async save(): Promise<void> {
    const edit = this._edit();
    if (!edit?.zone) {
      return;
    }
    this._edit.set(undefined);
    try {
      await this.send(edit.radarId, edit.controlId, edit.zone);
    } catch (err) {
      // the radar kept its old zone, so the user's edit is still unsaved
      if (!this._edit()) {
        this._edit.set(edit);
      }
      throw err;
    }
  }

  /** Arm or disarm a zone as the radar holds it, or as it was just saved. */
  async setEnabled(controlId: string, enabled: boolean): Promise<void> {
    const radarId = this.radarApi.radar()?.device?.id;
    const zone =
      this.pendingZone(radarId, controlId) ?? this.storedZone(controlId);
    if (radarId && zone) {
      await this.send(radarId, controlId, { ...zone, enabled });
    }
  }

  /** Remove a zone, leaving the radar's control as it is before any zone
   *  was set. */
  async clear(controlId: string): Promise<void> {
    const radarId = this.radarApi.radar()?.device?.id;
    if (!radarId) {
      return;
    }
    if (this._edit()?.controlId === controlId) {
      this._edit.set(undefined);
    }
    if (this.pendingZone(radarId, controlId)) {
      this.clearPending();
    }
    await this.radarApi.setControl(
      radarId,
      controlId,
      zoneControlValue(CLEARED_ZONE)
    );
  }

  private async send(radarId: string, controlId: string, zone: GuardZone) {
    const def = this.radarApi.radar()?.capabilities?.controls?.[controlId];
    const value = limitZone(zone, def?.maxDistance);
    this.setPending({ radarId, controlId, zone: value });
    try {
      await this.radarApi.setControl(
        radarId,
        controlId,
        zoneControlValue(value)
      );
    } catch (err) {
      this.clearPending();
      throw err;
    }
  }

  private pendingZone(
    radarId: string,
    controlId: string
  ): GuardZone | undefined {
    const pending = this.pending();
    return pending?.radarId === radarId && pending.controlId === controlId
      ? pending.zone
      : undefined;
  }

  private setPending(pending: PendingZone) {
    clearTimeout(this.pendingTimer);
    this.pending.set(pending);
    this.pendingTimer = setTimeout(() => this.clearPending(), PENDING_TIMEOUT);
  }

  private clearPending() {
    clearTimeout(this.pendingTimer);
    this.pending.set(undefined);
  }
}
