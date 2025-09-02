import { Injectable } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';

export interface AutopilotOptions {
  modes: string[];
  states: Array<{ name: string; engaged: boolean }>;
  actions: Array<{ id: string; name: string; available: boolean }>;
}

// ** Signal K autopilot service
@Injectable({ providedIn: 'root' })
export class AutopilotService {
  constructor(private signalk: SignalKClient, private app: AppFacade) {}

  /** return API path for pilot device
   * @param id autopilot device id
   */
  private getPath(id?: string): string {
    return `vessels/self/autopilots/${id ?? '_default'}`;
  }

  /** Retrieve Autopilot Options
   * @param pilotId Pilot device identifier
   */
  fetchOptions(pilotId?: string): Promise<AutopilotOptions> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(pilotId))
        .subscribe(
          (val: { options: AutopilotOptions }) => {
            if (val.options) {
              resolve(val.options);
            } else {
              reject(new Error('Invalid autopilot options!'));
            }
          },
          () => reject(new Error('No autopilot providers found!'))
        );
    });
  }

  /** Send Engage command
   * @param pilotId Pilot device identifier
   */
  engage(pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.getPath(pilotId)}/engage`, null)
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }

  /** Send Disengage command
   * @param pilotId Pilot device identifier
   */
  disengage(pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.getPath(pilotId)}/disengage`, null)
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }

  /** Send adjust target command
   * @param value Target value in degrees
   * @param pilotId Pilot device identifier
   */
  adjustTarget(value: number, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'number') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/target/adjust`, {
          value: value,
          units: 'deg'
        })
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }

  /** Send Engage command
   * @param enable true = enable dodge mode
   * @param pilotId Pilot device identifier
   */
  dodge(enable: boolean, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (enable) {
        this.signalk.api
          .post(this.app.skApiVersion, `${this.getPath(pilotId)}/dodge`, null)
          .subscribe(
            () => resolve(),
            (error: HttpErrorResponse) => reject(error)
          );
      } else {
        this.signalk.api
          .delete(this.app.skApiVersion, `${this.getPath(pilotId)}/dodge`)
          .subscribe(
            () => resolve(),
            (error: HttpErrorResponse) => reject(error)
          );
      }
    });
  }

  /** Send dodge adjust command
   * @param value Value in degrees
   * @param pilotId Pilot device identifier
   */
  adjustDodge(value: number, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'number') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/dodge`, {
          value: value,
          units: 'deg'
        })
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }

  /** Send mode command
   * @param value mode to set
   * @param pilotId Pilot device identifier
   */
  mode(value: string, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'string') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/mode`, {
          value: value
        })
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }

  /** Send state command
   * @param value State to set
   * @param pilotId Pilot device identifier
   */
  state(value: string, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'string') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/state`, {
          value: value
        })
        .subscribe(
          () => resolve(),
          (error: HttpErrorResponse) => reject(error)
        );
    });
  }
}
