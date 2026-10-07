import { inject, Injectable, signal } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { DeltaSignal } from 'src/app/types';

// SignalK server-api definitions
export interface SKRadarLegendEntry {
  type: string;
  color: string;
}

// Radar discovery entry (Radar API 3.4.0: lean RadarInfo). `id` is the map key
// in the /radars envelope, folded back into the entry. Static parameters
// (spokesPerRevolution, maxSpokeLength, legend) live on /capabilities.
export interface SKRadar {
  id: string;
  name: string;
  brand: string;
  model?: string;
  radarIpAddress?: string;
}

// GET /radars response envelope (Radar API 3.4.0)
export interface RadarsResponse {
  version: string;
  radars: Record<string, Omit<SKRadar, 'id'>>;
}

export interface CapabilityManifest {
  maxRange: number;
  minRange: number;
  supportedRanges: Array<number>;
  spokesPerRevolution: number;
  maxSpokeLength: number;
  pixelValues: number;
  legend: {
    dopplerApproaching: [number, number];
    dopplerReceding: [number, number];
    dopplerRain: [number, number];
    historyStart: number;
    lowReturn: number;
    mediumReturn: number;
    strongReturn: number;
    pixelColors: number;
    pixels: Array<SKRadarLegendEntry>;
  };
  hasDoppler: boolean;
  hasDualRange: boolean;
  hasDualRadar: boolean;
  hasSparseSpokes: boolean;
  noTransmitSectors: number;
  stationary: boolean;
  controls: Record<string, ControlDef>;
}

export interface ControlDef {
  id: number;
  name: string;
  description: string;
  category: string;
  dataType: string;
  /** Display label for each entry of `validValues`, keyed by value */
  descriptions?: Record<string | number, string>;
  minValue?: number | string;
  maxValue?: number | string;
  stepValue?: number;
  validValues?: Array<number | string>;
  isReadOnly?: boolean;
  hasEnabled?: boolean;
  hasAuto?: boolean;
  /** In auto mode the radar takes an adjustment (`autoValue`) within
   *  `autoAdjustMinValue`..`autoAdjustMaxValue` instead of a value */
  hasAutoAdjustable?: boolean;
  autoAdjustMinValue?: number;
  autoAdjustMaxValue?: number;
  maxDistance?: number;
  units?: string;
}

// Fields present depend on the control dataType: a button has no value and a
// rect carries geometry instead (see the server's ControlValue schema).
export interface ControlValue {
  timestamp?: string;
  value?: number | string;
  auto?: boolean;
  autoValue?: number | string;
  enabled?: boolean;
  /** false while the radar's current mode makes this control read-only */
  allowed?: boolean;
  endValue?: number;
  startDistance?: number;
  endDistance?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
}

// The writable part of a control value (Radar API PUT body)
export type ControlChange = Omit<ControlValue, 'timestamp' | 'allowed'>;

export interface ActiveRadar {
  device: SKRadar;
  capabilities: CapabilityManifest;
  controls: Map<string, ControlValue>;
}

// ** Signal K Radar API service
@Injectable({ providedIn: 'root' })
export class RadarAPIService {
  private readonly basePath = `vessels/self/radars`;
  private _hasWebGL = false;
  private _selectedRadar = signal<string>('');
  readonly radarId = this._selectedRadar.asReadonly();
  private _radar = signal<ActiveRadar>(undefined);
  readonly radar = this._radar.asReadonly();
  // every radar the server reported on the last init(), in its order
  private _radars = signal<SKRadar[]>([]);
  readonly radars = this._radars.asReadonly();
  // Radar API version reported by GET /radars. Empty for pre-3.4.0 servers,
  // which return a bare array with no version envelope.
  private _apiVersion = signal<string>('');
  readonly apiVersion = this._apiVersion.asReadonly();

  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private skstream = inject(SKStreamFacade);
  private worker = inject(SKWorkerService);

  private initialised = false;
  private initCalls = 0;
  private capabilityReads = 0;

  constructor() {
    this._hasWebGL = this.testForWebGL();
    this.skstream.vessels$().subscribe(() => this.onVessels());
    this.worker.radar$().subscribe((msg) => this.parseRadarDelta(msg));
  }

  private testForWebGL(): boolean {
    if (typeof OffscreenCanvas === 'undefined') {
      console.warn(
        '[FreeBoardSK] OffscreenCanvas not available — WebGL radar display disabled'
      );
      return false;
    }
    const gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    const result = gl ? true : false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    return result;
  }

  private onVessels() {
    if (this.initialised && !this._selectedRadar()) {
      this.app.debug('Radar now online....', 'Initialising....');
      this.init();
    }
  }

  /** return API path for radar device
   * @param id radar device id
   */
  private getPath(id?: string): string {
    return `vessels/self/radars/${id ?? '_default'}`;
  }

  get hasWebGL(): boolean {
    return this._hasWebGL;
  }

  public showNoWebGLMessage() {
    this.app.showAlert(
      'Radar Display',
      'Your device does not seem to have WebGL capability!\nTo display the radar overlay WebGL support is required.'
    );
  }

  /** Initialise radar */
  public async init(id?: string): Promise<string> {
    // Selections can overlap (another radar picked before the last one has
    // loaded); only the latest may change the radar state.
    const call = ++this.initCalls;
    const reads = this.capabilityReads;
    const radars = await this.listRadars();
    if (call !== this.initCalls) {
      return;
    }
    this._radars.set(radars);
    if (!radars.length) {
      this._selectedRadar.set('');
      return;
    }
    const keys = radars.map((r) => r.id);

    if (id) {
      if (!keys.includes(id)) {
        return;
      }
      this._selectedRadar.set(id);
    } else {
      if (keys.includes(this.app.config.radars.deviceId)) {
        this._selectedRadar.set(this.app.config.radars.deviceId);
      } else {
        this._selectedRadar.set(radars[0].id);
      }
    }
    const selected = this._selectedRadar();
    const previous = this._radar()?.device?.id;

    // populate selected radar details
    const rd: Partial<{
      device: SKRadar;
      capabilities: CapabilityManifest;
      controls: Record<string, ControlValue>;
    }> = {};
    try {
      [rd['device'], rd['capabilities'], rd['controls']] = await Promise.all([
        this.getRadar(selected),
        this.getCapabilities(selected),
        this.getControls(selected)
      ]);
    } catch {
      // Keep the radar that works, so the panel and its radar menu stay up.
      if (call === this.initCalls) {
        if (previous && previous !== selected) {
          this._selectedRadar.set(previous);
        } else {
          this._radar.set(undefined);
        }
      }
      return;
    }
    if (call !== this.initCalls) {
      return;
    }
    this.app.config.radars.deviceId = selected;
    this.app.saveConfig();
    // Radar API 3.4.0: the discovery object is lean and carries no id; fold in
    // the selected id so consumers (info panel, render, panel) can read it.
    rd['device'].id = selected;
    // keep the values of the controls the capabilities define
    const controls = new Map<string, ControlValue>();
    const cdef = rd['capabilities']['controls'] ?? {};
    Object.entries(rd['controls'] ?? {}).forEach(([id, value]) => {
      if (id in cdef) {
        controls.set(id, value);
      }
    });

    this._radar.set({
      device: rd['device'],
      capabilities: rd['capabilities'],
      controls
    });

    // A Range Units change while this loaded read the capabilities again,
    // and this load's own answer may be the older one, so read them once more.
    if (reads !== this.capabilityReads) {
      this.refreshCapabilities(selected);
    }

    this.app.debug(this._radar());
    this.initialised = true;
    return selected;
  }

  /** Update radar status and controls */
  private parseRadarDelta(msg: DeltaSignal) {
    if (!msg) return;
    // radars.<id>.controls.<name>: the stream carries every radar's controls,
    // and only the shown radar's belong in its panel
    const [, radarId, kind, controlId] = msg.path?.split('.') ?? [];
    if (kind !== 'controls') {
      return;
    }
    const shown = this._radar();
    const unitsChanged =
      controlId === 'rangeUnits' &&
      shown?.device?.id === radarId &&
      shown.controls?.has(controlId) &&
      shown.controls.get(controlId).value !==
        (msg.value as ControlValue)?.value;
    this._radar.update((current) => {
      if (
        current?.device?.id !== radarId ||
        !current.controls ||
        !current.capabilities?.controls?.[controlId]
      ) {
        return current;
      }
      // a new object, so the panel sees the change
      const controls = new Map(current.controls);
      controls.set(controlId, msg.value as ControlValue);
      return { ...current, controls };
    });
    if (unitsChanged) {
      this.refreshCapabilities(radarId);
    }
  }

  /** Read the radar's capabilities again. Its range list, values and labels,
   *  is that of the unit system its Range Units are set to, and changes with
   *  them; the stream carries only control values, not their definitions. */
  private async refreshCapabilities(radarId: string) {
    // Only the newest read counts, and none started before a reload: a
    // slower, older answer must not replace newer capabilities.
    const read = ++this.capabilityReads;
    const call = this.initCalls;
    let capabilities: CapabilityManifest;
    try {
      capabilities = await this.getCapabilities(radarId);
    } catch {
      return;
    }
    if (read !== this.capabilityReads || call !== this.initCalls) {
      return;
    }
    this._radar.update((current) =>
      current?.device?.id === radarId ? { ...current, capabilities } : current
    );
  }

  /** Return list of available radars */
  public async listRadars(): Promise<SKRadar[]> {
    return new Promise((resolve) => {
      this.signalk.api.get(this.app.skApiVersion, this.basePath).subscribe({
        next: (val: SKRadar[] | RadarsResponse) => {
          if (Array.isArray(val)) {
            // Legacy (pre-3.4.0) servers return a bare array (no version).
            this._apiVersion.set('');
            resolve(val);
          } else if (
            val &&
            val.radars !== null &&
            typeof val.radars === 'object' &&
            !Array.isArray(val.radars)
          ) {
            // Radar API 3.4.0: { version, radars } keyed by radar id.
            this._apiVersion.set(val.version ?? '');
            resolve(
              Object.entries(val.radars).map(([id, info]) => ({ ...info, id }))
            );
          } else {
            // Malformed / unexpected response — fall back to no radars.
            this._apiVersion.set('');
            resolve([]);
          }
        },
        error: () => resolve([])
      });
    });
  }

  /** Retrieve Radar Details
   * @param radarId Radar device identifier
   */
  public getRadar(radarId: string = this._selectedRadar()): Promise<SKRadar> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(radarId))
        .subscribe({
          next: (val: SKRadar) => {
            if (val) {
              resolve(val);
            } else {
              reject(new Error('Invalid radar details!'));
            }
          },
          error: () => reject(new Error('No radar provider found!'))
        });
    });
  }

  /** Retrieve Radar Capabilities
   * @param radarId Radar device identifier
   */
  public getCapabilities(
    radarId: string = this._selectedRadar()
  ): Promise<CapabilityManifest> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `${this.getPath(radarId)}/capabilities`)
        .subscribe({
          next: (val: CapabilityManifest) => {
            if (val) {
              resolve(val);
            } else {
              reject(new Error('Invalid radar capability manifest!'));
            }
          },
          error: () => reject(new Error('No radar provider found!'))
        });
    });
  }

  /** Retrieve current Radar control values (the definitions are on
   * `/capabilities`)
   * @param radarId Radar device identifier
   */
  public getControls(
    radarId: string = this._selectedRadar()
  ): Promise<Record<string, ControlValue>> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `${this.getPath(radarId)}/controls`)
        .subscribe({
          next: (val: Record<string, ControlValue>) => resolve(val),
          error: () => reject(new Error('Unable to retrieve Radar controls!'))
        });
    });
  }

  /**
   * Send a control change to the server: `{ value }`, `{ auto }`,
   * `{ auto, value }` or, for a button, `{}`.
   */
  public setControl(
    radarId: string = this._selectedRadar(),
    controlId: string,
    change: ControlChange
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(
          this.app.skApiVersion,
          `${this.getPath(radarId)}/controls/${controlId}`,
          change
        )
        .subscribe({
          next: () => resolve(),
          error: () => reject(new Error('Error setting Radar control value!'))
        });
    });
  }
}
