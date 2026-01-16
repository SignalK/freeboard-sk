import { inject, Injectable, signal } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';

// ** WDantuma classes
export class SKRadarLegendEntry {
  type: string;
  color: string;
}
export class SKRadar {
  id: string;
  name: string;
  spokes: number;
  maxSpokeLen: number;
  streamUrl: string;
  legend: {[key:string]: SKRadarLegendEntry};
}
// *************

export interface SKRadar2 {
  id: string;
  name: string;
  make: string;
  brand: string;
  model?: string;
  status: string;
  spokesPerRevolution: number;
  maxSpokeLen: number;
  range: number;
  controls: {
    power: number;
    range: number;
  };
}

// from server-api
export interface CapabilityManifest {
  id: string;
  make: string;
  model: string;
  modelFamily?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  characteristics: Characteristics;
  controls: ControlDefinition[];
  constraints?: ControlConstraint[];
  supportedFeatures?: SupportedFeature[]; // Optional API features this provider implements
}

type SupportedFeature = 'arpa' | 'guardZones' | 'trails' | 'dualRange';

interface Characteristics {
  maxRange: number; // Maximum detection range in meters
  minRange: number; // Minimum detection range in meters
  supportedRanges: number[]; // Discrete range values in meters
  spokesPerRevolution: number;
  maxSpokeLength: number;
  hasDoppler: boolean;
  hasDualRange: boolean;
  maxDualRange?: number; // Max range in dual-range mode (meters), omitted if 0
  noTransmitZoneCount: number;
}

interface ControlDefinition {
  id: string; // Semantic ID (e.g., "gain", "beamSharpening")
  name: string; // Human-readable name
  description: string; // Tooltip/help text
  category: 'base' | 'extended' | 'installation';
  type: 'boolean' | 'number' | 'enum' | 'compound' | 'string';
  range?: RangeSpec; // For number types
  values?: EnumValue[]; // For enum types
  properties?: Record<string, PropertyDefinition>; // For compound types
  modes?: string[]; // e.g., ["auto", "manual"]
  defaultMode?: string;
  readOnly?: boolean; // True for info fields
  default?: any;
}

interface RangeSpec {
  min: number;
  max: number;
  step?: number;
  unit?: string; // e.g., "percent", "meters", "hours"
}

interface EnumValue {
  value: string | number;
  label: string;
  description?: string;
  readOnly?: boolean; // True if this value can be reported but not set by clients
}

interface PropertyDefinition {
  type: string;
  description?: string;
  range?: RangeSpec;
  values?: EnumValue[];
}

interface ControlConstraint {
  controlId: string;
  condition: {
    type: 'disabled_when' | 'read_only_when' | 'restricted_when';
    dependsOn: string; // Control ID this depends on
    operator: string; // "==", "!=", "<", ">", etc.
    value: any; // Value to compare against
  };
  effect: {
    disabled?: boolean;
    readOnly?: boolean;
    allowedValues?: any[]; // Restricted set when condition is met
    reason?: string; // Human-readable explanation
  };
}

interface RadarState {
  id: string;
  timestamp: string; // ISO 8601
  status: 'off' | 'standby' | 'transmit' | 'warming';
  controls: Record<string, any>;
  disabledControls?: DisabledControl[];
  streamUrl?: string; // WebSocket URL for spoke data
}

interface DisabledControl {
  controlId: string;
  reason: string;
}

// ** Signal K Radar API service
@Injectable({ providedIn: 'root' })
export class RadarAPIService {
  private readonly basePath = `vessels/self/radars`;

  private _defaultRadar = signal<string>('');
  readonly defaultRadar = this._defaultRadar.asReadonly();

  protected app = inject(AppFacade);
  protected signalk = inject(SignalKClient);

  constructor() {}

  /** return API path for radar device
   * @param id radar device id
   */
  private getPath(id?: string): string {
    return `vessels/self/radars/${id ?? '_default'}`;
  }

  /** Retrieve list of available radar identifiers */
  public listRadars(): Promise<SKRadar2[]> {
    return new Promise((resolve, reject) => {
      this.signalk.api.get(this.app.skApiVersion, this.basePath).subscribe(
        (val: SKRadar2[]) => {
          if (Array.isArray(val)) {
            if (val.length && !this._defaultRadar()) {
              this._defaultRadar.set(val[0].id);
            }
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
  public getRadar(radarId?: string): Promise<SKRadar2> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(radarId))
        .subscribe(
          (val: SKRadar2) => {
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

  /** Retrieve Radar State
   * @param radarId Radar device identifier
   */
  getState(radarId?: string): Promise<RadarState> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(radarId))
        .subscribe(
          (val: RadarState) => {
            if (val) {
              resolve(val);
            } else {
              reject(new Error('Invalid radar state!'));
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
        .get(this.app.skApiVersion, this.getPath(radarId))
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
}
