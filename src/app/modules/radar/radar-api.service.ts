import { inject, Injectable, signal } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';

export interface SKRadarLegendEntry {
  type: string;
  color: string;
}

// Radar Definition for rendering
export interface RadarDef {
  id: string;
  name: string;
  spokesPerRevolution: number;
  maxSpokeLen: number;
  streamUrl: string;
  legend: Record<string, SKRadarLegendEntry>;
}

// server-api /radars response
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

// from server-api
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
}

// ** Signal K Radar API service
@Injectable({ providedIn: 'root' })
export class RadarAPIService {
  private readonly basePath = `vessels/self/radars`;
  private _hasWebGL = false;
  private _selectedRadar = signal<string>('');
  readonly radarId = this._selectedRadar.asReadonly();

  protected app = inject(AppFacade);
  protected signalk = inject(SignalKClient);

  constructor() {
    this._hasWebGL = this.testForWebGL();
  }

  get hasWebGL(): boolean {
    return this._hasWebGL;
  }

  public showWebGLMessage() {
    this.app.showAlert(
      'Radar Display',
      'Your device does not seem to have WebGL capability!\nTo display the radar overlay WebGL support is required.'
    );
  }

  /** return API path for radar device
   * @param id radar device id
   */
  private getPath(id?: string): string {
    return `vessels/self/radars/${id ?? '_default'}`;
  }

  public async listRadars(): Promise<SKRadar[]> {
    try {
      const radars = await this.fetchRadars();
      const keys = radars.map((r) => r.id);
      if (!radars.length) {
        this._selectedRadar.set('');
      } else {
        if (keys.includes(this.app.config.radars.deviceId)) {
          this._selectedRadar.set(this.app.config.radars.deviceId);
        } else {
          this._selectedRadar.set(radars[0].id);
          this.app.config.radars.deviceId = radars[0].id;
          this.app.saveConfig();
        }
      }
      return radars;
    } catch {
      this._selectedRadar.set('');
      Promise.resolve([]);
    }
  }

  /** Fetch list of available radar identifiers from server*/
  private fetchRadars(): Promise<SKRadar[]> {
    return new Promise((resolve, reject) => {
      this.signalk.api.get(this.app.skApiVersion, this.basePath).subscribe(
        (val: SKRadar[]) => {
          if (Array.isArray(val)) {
            resolve(val);
          } else {
            reject(new Error('Invalid response!'));
          }
        },
        () => reject(new Error('No radar providers found!'))
      );
    });
  }

  /** Retrieve Radar Details
   * @param radarId Radar device identifier
   */
  public getRadar(radarId?: string): Promise<SKRadar> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(radarId))
        .subscribe(
          (val: SKRadar) => {
            if (val) {
              resolve(val);
            } else {
              reject(new Error('Invalid radar details!'));
            }
          },
          () => reject(new Error('No radar providers found!'))
        );
    });
  }

  /** Retrieve Radar Capabilities
   * @param radarId Radar device identifier
   */
  getCapabilities(radarId?: string): Promise<CapabilityManifest> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `${this.getPath(radarId)}/capabilities`)
        .subscribe(
          (val: CapabilityManifest) => {
            if (val) {
              resolve(val);
            } else {
              reject(new Error('Invalid radar capability manifest!'));
            }
          },
          () => reject(new Error('No radar providers found!'))
        );
    });
  }

  /**
   * Test if WebGL is supported
   */
  testForWebGL(): boolean {
    let gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    const result = gl ? true : false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      gl = null;
    }
    return result;
  }
}
