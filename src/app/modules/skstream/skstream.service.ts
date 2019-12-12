/** Signal K Stream worker service
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { AppInfo } from 'src/app/app.info';

interface IWorkerCommand {
    options: any;
    cmd: string;
}

@Injectable({ providedIn: 'root' })
export class SKStreamProvider  {
    
    private worker: Worker;
    private messageSource= new Subject<any>();

    constructor(private app: AppInfo) { 
        this.worker= new Worker('../../skstream.worker', { type: 'module' });
        this.worker.onmessage = ({ data }) => { this.handleMessage(data) };
    }

    message$() { return this.messageSource.asObservable() }

    // ************ Worker Functions *********************
    settings(value:any) { this.worker.postMessage({ cmd: 'settings', options: value }) }

    terminate() {
        if(this.worker) {
            this.close(true);
            this.app.debug('Terminating Worker....');
            this.worker.terminate();  
            this.worker= undefined;        
        }
    }

    close(terminate:boolean=false) {
        if(this.worker) {
            this.app.debug('Closing Worker Stream....');
            this.worker.postMessage({ cmd: 'close', options: {terminate: terminate} });            
        }        
    }

    postMessage(msg:IWorkerCommand) { if(this.worker) { this.worker.postMessage(msg) } }

    private handleMessage(msg:any) { this.messageSource.next(msg) }  

    // *********************************    

}