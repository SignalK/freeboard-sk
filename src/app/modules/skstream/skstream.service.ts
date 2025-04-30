/** Signal K Stream worker service
 * ************************************/
import { Injectable, signal } from '@angular/core';
import { PathValue } from '@signalk/server-api';
import { Subject } from 'rxjs';
import {
  NotificationMessage,
  ResourceDeltaSignal,
  UpdateMessage
} from 'src/app/types';

interface IWorkerCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  cmd: string;
}

@Injectable({ providedIn: 'root' })
export class SKWorkerService {
  private worker: Worker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private messageSource = new Subject<any>();
  private notificationSource = new Subject<NotificationMessage>();
  private resourceUpdatesSource = new Subject<PathValue[]>();
  private resourceDeltaSignal = signal<ResourceDeltaSignal>({
    path: '',
    value: null
  });
  public readonly resourceUpdate = this.resourceDeltaSignal.asReadonly();

  constructor() {
    this.worker = new Worker(new URL('./skstream.worker', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      this.handleMessage(data);
    };
  }

  message$() {
    return this.messageSource.asObservable();
  }

  resource$() {
    return this.resourceUpdatesSource.asObservable();
  }

  notification$() {
    return this.notificationSource.asObservable();
  }

  // ************ Worker Functions *********************
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings(value: any) {
    this.worker.postMessage({ cmd: 'settings', options: value });
  }

  terminate() {
    if (this.worker) {
      this.close(true);
      console.log('Terminating Worker....');
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  close(terminate = false) {
    if (this.worker) {
      console.log('Closing Worker Stream....');
      this.worker.postMessage({
        cmd: 'close',
        options: { terminate: terminate }
      });
    }
  }

  postMessage(msg: IWorkerCommand) {
    if (this.worker) {
      this.worker.postMessage(msg);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleMessage(msg: any) {
    if (msg.action === 'notification') {
      this.notificationSource.next(msg as NotificationMessage);
    } else if (msg.action === 'resource') {
      this.resourceDeltaSignal.set(msg.result);
    } else {
      if (
        msg.action === 'update' &&
        !msg.playback &&
        Array.isArray(msg.result.self.resourceUpdates) &&
        msg.result.self.resourceUpdates.length !== 0
      ) {
        // emit resource$
        this.resourceUpdatesSource.next(msg.result.self.resourceUpdates);
      }
      // emit message$
      this.messageSource.next(msg);
    }
  }
}
