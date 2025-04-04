/** Signal K Stream worker service
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationMessage } from 'src/app/types';

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

  constructor() {
    this.worker = new Worker(new URL('./skstream.worker', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      this.handleMessage(data);
    };
  }

  message$() {
    return this.messageSource.asObservable();
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
    } else {
      this.messageSource.next(msg);
    }
  }

  // *********************************
}
