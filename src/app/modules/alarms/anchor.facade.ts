/** Settings abstraction Facade
 * ************************************/
import { effect, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Position } from 'src/app/types';
import { SKStreamFacade } from '../skstream/skstream.facade';

@Injectable({ providedIn: 'root' })
export class AnchorFacade {
  // **************** ATTRIBUTES ***************************
  private raisedSignal = signal<boolean>(true);
  readonly raised = this.raisedSignal.asReadonly();
  private positionSignal = signal<Position>(null);
  readonly position = this.positionSignal.asReadonly();
  private radiusSignal = signal<number>(0);
  readonly radius = this.radiusSignal.asReadonly();
  // *******************************************************

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private stream: SKStreamFacade
  ) {
    effect(() => {
      if (this.stream.selfAnchor()) {
        this.parseAnchorStatus(this.stream.selfAnchor());
      }
    });
  }

  /**
   * @description Set the value of the raisedSignal
   * @param value value to set for the signal
   */
  public setRaisedSignal(value: boolean) {
    this.raisedSignal.set(value);
  }

  /**
   * @description Set anchor position
   * @param position
   * @returns Promise
   */
  public setAnchorPosition(position: Position) {
    if (!position) {
      return;
    }
    return new Promise((resolve, reject) => {
      this.signalk
        .post('/plugins/anchoralarm/setAnchorPosition', {
          position: {
            latitude: position[1],
            longitude: position[0]
          }
        })
        .subscribe(
          () => resolve(true),
          (err: HttpErrorResponse) => {
            reject(err);
          }
        );
    });
  }

  /**
   * @description Query anchor status from server
   */
  public queryAnchorStatus(context: string, position?: Position) {
    this.app.debug('Retrieving anchor status...');
    context = !context || context === 'self' ? 'vessels/self' : context;
    this.signalk.api.get(`/${context}/navigation/anchor`).subscribe(
      (r: any) => {
        const pos: Position = r.position?.value
          ? [r.position.value.longitude, r.position.value.latitude]
          : null;
        const data = {
          position: pos,
          maxRadius: r.maxRadius?.value ? r.maxRadius.value : null,
          radius: r.currentRadius?.value ? r.currentRadius.value : null
        };
        this.parseAnchorStatus(data, position);
      },
      () => {
        this.positionSignal.set([0, 0]);
        this.raisedSignal.set(true);
      }
    );
  }

  // ** process anchor status
  private parseAnchorStatus(
    r: { maxRadius?: number; position?: Position; radius?: number },
    position?: Position
  ) {
    if (
      r.position &&
      typeof r.position[0] === 'number' &&
      typeof r.position[0] === 'number'
    ) {
      this.positionSignal.set(r.position);
      this.raisedSignal.set(false);
    } else {
      if (position) {
        this.positionSignal.set(position);
      }
      this.raisedSignal.set(true);
    }
    this.radiusSignal.set(r.maxRadius ?? -1);
  }
}
