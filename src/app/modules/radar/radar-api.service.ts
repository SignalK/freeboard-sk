import { effect, inject, Injectable, signal } from '@angular/core';

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

export interface SKRadar {
  id: string;
  name: string;
  brand: string;
  status: string;
  spokesPerRevolution: number;
  maxSpokeLen: number;
  range: number;
  controls: Record<string, Record<string, any>>;
}

export interface CapabilityManifest {
  maxRange: number;
  minRange: number;
  supportedRanges: Array<number>;
  spokesPerRevolution: number;
  maxSpokeLen: number;
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
  descriptions?: Record<any, any>;
  minValue?: number | string;
  maxValue?: number | string;
  stepValue?: number;
  validValues?: Array<number | string>;
  isReadOnly?: boolean;
  hasEnabled?: boolean;
  maxDistance?: number;
  units?: string;
}

export interface ControlValue {
  timestamp: string;
  value: number | string;
  auto?: boolean;
  autoValue?: number | string;
  enabled?: boolean;
  endValue?: number;
  startDistance?: number;
  endDistance?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
}

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

  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private skstream = inject(SKStreamFacade);
  private worker = inject(SKWorkerService);

  private initialised = false;

  constructor() {
    this._hasWebGL = this.testForWebGL();
    this.skstream.vessels$().subscribe(() => this.onVessels());
    effect(() => {
      this.parseRadarDelta(this.worker.radarUpdate());
    });
  }

  private testForWebGL(): boolean {
    if (typeof OffscreenCanvas === 'undefined') {
      console.warn(
        '[FreeBoardSK] OffscreenCanvas not available — WebGL radar display disabled'
      );
      return false;
    }
    let gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    const result = gl ? true : false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      gl = null;
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
    const radars = await this.listRadars();
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
    this.app.config.radars.deviceId = this._selectedRadar();
    this.app.saveConfig();

    // populate selected radar details
    const rd = {};
    try {
      await Promise.all([
        (rd['device'] = await this.getRadar()),
        (rd['capabilities'] = await this.getCapabilities()),
        (rd['controls'] = await this.getControls())
      ]);
    } catch {
      this._radar.set(undefined);
      return;
    }
    // filter controls
    const baseControls = new Map<string, any>();
    const cdef = rd['capabilities']['controls'];
    Object.entries(rd['controls']).forEach((i: any[]) => {
      if (i[0] in cdef && cdef[i[0]].category === 'base') {
        baseControls.set(i[0], i[1]);
      }
    });

    this._radar.set({
      device: rd['device'],
      capabilities: rd['capabilities'],
      controls: baseControls
    });

    this.app.debug(this._radar());
    this.initialised = true;
    return this._selectedRadar();
  }

  /** Update radar status and controls */
  private parseRadarDelta(msg: DeltaSignal) {
    if (!msg) return;
    const m = msg.path?.split('.');
    if (m[2] === 'controls') {
      this._radar.update((current) => {
        if (current?.controls) {
          current.controls.set(m[3], msg.value);
        }
        return current;
      });
    }
  }

  /** Return list of available radars */
  public async listRadars(): Promise<SKRadar[]> {
    return new Promise((resolve, reject) => {
      this.signalk.api.get(this.app.skApiVersion, this.basePath).subscribe({
        next: (val: SKRadar[]) => {
          resolve(Array.isArray(val) ? val : []);
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

  /** Retrieve Radars Controls
   * @param radarId Radar device identifier
   */
  public getControls(
    radarId: string = this._selectedRadar()
  ): Promise<Record<string, ControlDef>> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `${this.getPath(radarId)}/controls`)
        .subscribe({
          next: (val: Record<string, ControlDef>) => resolve(val),
          error: () => reject(new Error('Unable to retrieve Radar controls!'))
        });
    });
  }

  /**
   * Send new control value to server.
   */
  public setControl(
    radarId: string = this._selectedRadar(),
    controlId: string,
    value: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(
          this.app.skApiVersion,
          `${this.getPath(radarId)}/controls/${controlId}`,
          { value: value }
        )
        .subscribe({
          next: () => resolve(),
          error: () => reject(new Error('Error setting Radar control value!'))
        });
    });
  }
}
