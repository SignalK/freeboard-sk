import {
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR
} from 'src/app/modules/skresources/resource-classes';

type AisIds = Array<string>;

interface WorkerMessageBase {
  action: string;
  playback: boolean;
  result: ResultPayload;
  self: string;
  timestamp: string;
}

export interface ResultPayload {
  self: SKVessel;
  aisTargets: Map<string, SKVessel>;
  aisStatus: {
    updated: AisIds;
    stale: AisIds;
    expired: AisIds;
  };
  paths: { [key: string]: string };
  atons: Map<string, SKAtoN>;
  aircraft: Map<string, SKAircraft>;
  sar: Map<string, SKSaR>;
}

export class NotificationMessage implements WorkerMessageBase {
  action: string;
  playback = false;
  result = null;
  type: string;
  self = null;
  timestamp: string;

  constructor(type: string) {
    this.action = 'notification';
    this.type = type;
  }
}

export class UpdateMessage implements WorkerMessageBase {
  action: string;
  playback = false;
  result = null;
  timestamp: string;
  self = null;

  constructor() {
    this.action = 'update';
  }
}
