/** Settings abstraction Facade
 * ************************************/
import { effect, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { getDistance } from 'geolib';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { Position, SKPosition } from 'src/app/types';
import { SKStreamFacade } from '../skstream/skstream.facade';

/** GET `navigation/anchor` — each child path arrives as a `{ value }` node */
interface AnchorStatusResponse {
  position?: { value?: SKPosition };
  maxRadius?: { value?: number };
  currentRadius?: { value?: number };
}

/** The anchor alarm plugins Anchor Watch can drive, by plugin id. */
export type AnchorPlugin = 'anchoralarm' | 'hoekens-anchor-alarm';

/** Hoeken's watch zone: the shape around the anchor, without its position. */
interface WatchZone {
  type: string;
  radius?: number;
}

@Injectable({ providedIn: 'root' })
export class AnchorService {
  // **************** ATTRIBUTES ***************************
  private raisedSignal = signal<boolean>(true);
  readonly raised = this.raisedSignal.asReadonly();
  private positionSignal = signal<Position>(null);
  readonly position = this.positionSignal.asReadonly();
  private radiusSignal = signal<number>(0);
  readonly radius = this.radiusSignal.asReadonly();
  private pluginSignal = signal<AnchorPlugin>('anchoralarm');
  readonly plugin = this.pluginSignal.asReadonly();
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
   * @description Set the anchor alarm plugin the commands go to
   * @param id Plugin id
   */
  public setPlugin(id: AnchorPlugin) {
    this.pluginSignal.set(id);
  }

  /** Only signalk-anchoralarm-plugin can place the anchor from a rode length. */
  public supportsManualSet(): boolean {
    return this.plugin() === 'anchoralarm';
  }

  private post(route: string, body: object): Observable<unknown> {
    return this.signalk.post(`/plugins/${this.plugin()}/${route}`, body);
  }

  /**
   * @description Drop the anchor at the vessel position
   * @param radius Alarm radius in meters; the plugin's own when not given
   */
  public drop(radius?: number): Observable<unknown> {
    if (this.plugin() === 'hoekens-anchor-alarm') {
      return this.post(
        'dropAnchor',
        typeof radius === 'number' ? { zone: { type: 'circle', radius } } : {}
      );
    }
    return this.post(
      'dropAnchor',
      typeof radius === 'number' ? { radius: radius } : {}
    );
  }

  /** @description Raise the anchor */
  public raise(): Observable<unknown> {
    return this.post('raiseAnchor', {});
  }

  /**
   * @description Set the alarm radius
   * @param radius Alarm radius in meters; the vessel's distance from the
   * anchor when not given
   */
  public setRadius(radius?: number): Observable<unknown> {
    if (this.plugin() === 'hoekens-anchor-alarm') {
      // Hoeken's plugin needs the radius itself; signalk-anchoralarm-plugin
      // measures it when none is given.
      if (typeof radius !== 'number') {
        const vessel = this.app.data.vessels.self.position;
        const anchor = this.position();
        radius = Math.ceil(
          getDistance(
            { longitude: vessel[0], latitude: vessel[1] },
            { longitude: anchor[0], latitude: anchor[1] },
            0.01
          )
        );
      }
      return this.post('setZone', { zone: { type: 'circle', radius } });
    }
    return this.post(
      'setRadius',
      typeof radius === 'number' ? { radius: radius } : {}
    );
  }

  /**
   * @description Place the anchor from the length of rode let out
   * (signalk-anchoralarm-plugin only)
   * @param rodeLength Rode length in meters
   */
  public setManualAnchor(rodeLength: number): Observable<unknown> {
    return this.post('setManualAnchor', { rodeLength: rodeLength });
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
    const latLon = { latitude: position[1], longitude: position[0] };
    // Hoeken's plugin moves the anchor through setZone, which keeps the
    // anchoring session and needs the zone sent back with the new position.
    const request =
      this.plugin() === 'hoekens-anchor-alarm'
        ? this.signalk.api
            .get('/vessels/self/navigation/anchor/watchZone')
            .pipe(
              switchMap((zone: { value?: WatchZone }) =>
                this.post('setZone', { zone: zone.value, position: latLon })
              )
            )
        : this.post('setAnchorPosition', { position: latLon });
    return new Promise((resolve, reject) => {
      request.subscribe({
        next: () => resolve(true),
        error: (err: HttpErrorResponse) => {
          reject(err);
        }
      });
    });
  }

  /**
   * @description Query anchor status from server
   */
  public queryAnchorStatus(context: string, position?: Position) {
    this.app.debug('Retrieving anchor status...');
    context = !context || context === 'self' ? 'vessels/self' : context;
    this.signalk.api.get(`/${context}/navigation/anchor`).subscribe(
      (r: AnchorStatusResponse) => {
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
