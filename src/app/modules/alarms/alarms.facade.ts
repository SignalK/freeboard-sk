/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject, forkJoin, Observable } from 'rxjs';

import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamProvider } from '../skstream/skstream.service';

interface IStatus {
    action: string;
    error: boolean;
    result: any;
}


@Injectable({ providedIn: 'root' })
export class AlarmsFacade  {

   // **************** ATTRIBUTES ***************************

    private anchorSource= new Subject<any>();
    private alarmSource= new Subject<any>();
    private closestApproachSource= new Subject<any>();

    public alarms= this.app.data.alarms;

   // *******************************************************    

    constructor(private app: AppInfo, 
                private signalk: SignalKClient, 
                private stream: SKStreamProvider) { 
        // ** SIGNAL K STREAM **
        this.stream.message$().subscribe(
            (msg:any)=> {
                if(msg.action=='notification' ) { this.processNotifications(msg) }                             
            }
        );              
    }

    anchorStatus$(): Observable<IStatus> { return this.anchorSource.asObservable() }
    closestApproach$(): Observable<any> { return this.closestApproachSource.asObservable() }
    update$(): Observable<boolean> { return this.alarmSource.asObservable() }
    

    // ******** ANCHOR WATCH EVENTS ************
    anchorEvent(e:any, context?:string, position?:[number,number]) {
        context= (context) ? context : 'self';
        if(e.raised===null) { //send radius value only
            this.app.config.anchorRadius= e.radius;
            this.signalk.api.put(
                context, 
                '/navigation/anchor/maxRadius', 
                e.radius
            ).subscribe(
                ()=> { this.app.saveConfig() },
                err=> { 
                    this.parseAnchorError(err, 'raise'); 
                    this.queryAnchorStatus(context, position); 
                }
            );
        }
        else if(!e.raised) {  // ** drop anchor
            this.app.config.anchorRadius= e.radius;
            let aPosition= this.signalk.api.put(
                context,
                '/navigation/anchor/position', 
                {
                    latitude: position[1],
                    longitude: position[0]
                }
            );
            let aRadius= this.signalk.api.put(
                context, 
                '/navigation/anchor/maxRadius', 
                e.radius
            );
            let res= forkJoin([aPosition, aRadius]);
            res.subscribe(
                ()=> { this.app.saveConfig() },
                err=> { 
                    this.parseAnchorError(err, 'drop'); 
                    this.queryAnchorStatus(context, position); 
                }
            );                                     
        }
        else {  // ** raise anchor
            this.app.data.alarms.delete('anchor');
            this.signalk.api.put(
                context, 
                '/navigation/anchor/position', 
                null 
            ).subscribe(
                ()=> { },
                err=> { 
                    this.parseAnchorError(err, 'raise'); 
                    this.queryAnchorStatus(context, position); 
                }
            );             
        }
    }

    // ** update anchor status from received vessel data**
    updateAnchorStatus() { this.parseAnchorStatus(this.app.data.vessels.self.anchor) }

    // ** query anchor status
    queryAnchorStatus(context:string, position?:[number,number]) {
        this.app.debug('Retrieving anchor status...');
        context= (!context || context=='self') ? 'vessels/self' : context;
        this.signalk.api.get(`/${context}/navigation/anchor`).subscribe(
            r=> { 
                let aData= { position: null, maxRadius: null };
                if(r['position']) {
                    aData.position=(typeof r['position']['value']!=='undefined') 
                        ? r['position']['value'] : null;
                }
                if(r['maxRadius']) {
                    aData.maxRadius= (typeof r['maxRadius']['value']== 'number')
                        ? r['maxRadius']['value'] : null;
                }
                this.parseAnchorStatus(aData, position); 
            },
            err=> { 
                this.app.data.anchor.position= [0,0];
                this.app.data.anchor.raised= true;
            }
        ); 
    }

    // ** process anchor watch errors
    parseAnchorError(e:any, action:string) {
        this.app.debug(e); 
        if(e.status && e.status==401) { 
            // ** emit anchorStatus$ **
            this.anchorSource.next({
                action: action,
                error: true,
                result: e.status
            });            
        }  
        if(e.status && e.status!=200) { 
            this.anchorSource.next({
                action: action,
                error: true,
                result: e.status
            });  
        }    
    }

    // ** process anchor status
    parseAnchorStatus(r:any, position?:[number,number]) {
        if(r.position && typeof r.position.latitude== 'number' && typeof r.position.longitude== 'number') {
            this.app.data.anchor.position= [
                r.position.longitude,
                r.position.latitude
            ]
            this.app.data.anchor.raised= false;
        }  
        else { 
            if(position) { this.app.data.anchor.position= position }
            this.app.data.anchor.raised= true;
        }
        
        if(typeof r.maxRadius=='number') { this.app.data.anchor.radius= r.maxRadius }    
        
        // ** emit anchorStatus$ **
        this.anchorSource.next({
            action: 'query',
            error: false,
            result: this.app.data.anchor
        });
    }

    // ******** ALARM ACTIONS ************

    muteAlarm(id:string) { this.alarms.get(id)['muted']=true }

    unMuteAlarm(id:string) { this.alarms.get(id)['muted']=false }

    acknowledgeAlarm(id:string) { this.alarms.get(id)['acknowledged']=true }

    unAcknowledgeAlarm(id:string) { this.alarms.get(id)['acknowledged']=false }

    clearAlarm(id:string) { this.alarms.delete(id) }

    // ** update alarm state **
    updateAlarm(id: string, notification: any) {
        if(notification==null) {    // alarm cancelled
            this.alarms.delete(id);
            this.alarmSource.next(true);
            return;
        }
        let alarm= (this.alarms.has(id)) ? this.alarms.get(id) : null;
        if(notification.state=='normal') { // alarm returned to normal state
            if( alarm && alarm.acknowledged ) { 
                if(id=='depth') {
                    if(!alarm.isSmoothing) { alarm.isSmoothing= true }
                    setTimeout( ()=> {
                        this.alarms.delete(id);
                    }, this.app.config.depthAlarm.smoothing);
                }
                else { this.alarms.delete(id) }
            }
        }        
        else if(notification.state!=='normal') {
            if( !alarm ) {  // create alarm entry
                this.alarms.set(id, {
                    sound: (notification.method.includes('sound')!=-1) ? true : false,
                    visual: (notification.method.includes('visual')!=-1) ? true : false,
                    state: notification.state,
                    message: notification.message,
                    isSmoothing: false
                });
            }
            else {  // update alarm entry
                alarm.state= notification.state;
                alarm.message= notification.message;
            }  
        }
        this.alarmSource.next(true);
    }

    // ** process notification messages **
    private processNotifications(msg:any) {
        switch(msg.type) {
            case 'depth':
                if(this.app.config.depthAlarm.enabled) {
                    this.updateAlarm(msg.type, msg.result.value);                                    
                } 
                break;
            case 'buddy':
                this.app.showMessage(
                    msg.result.value.message, 
                    (msg.result.value.method.includes('sound')!=-1) ? true : false,
                    5000
                ); 
                break;          
            case 'closestApproach':
                this.updateClosestApproach(msg);
                this.closestApproachSource.next(msg);
                break;
            default:
                this.updateAlarm(msg.type, msg.result.value);
        }                        
    }

    private updateClosestApproach(msg:any) {
        msg.result.value.method=['visual'];   // visual only!
        let vessel= msg.result.context;
        this.app.data.vessels.closest.id= vessel;
        if(!vessel || msg.result.value.state=='normal') {
            this.app.data.vessels.closest= {id: null, distance: null, timeTo: null, position: [0,0]}
            return;
        }
        let cv= this.app.data.vessels.aisTargets.get('vessels.' + this.app.data.vessels.closest.id);
        if(cv) {
            this.app.data.vessels.closest.position= cv.position;
            this.app.data.vessels.closest.distance= (
                cv.closestApproach && typeof cv.closestApproach.distance!=='undefined') ? 
                cv.closestApproach.distance : null;
            this.app.data.vessels.closest.timeTo= (
                cv.closestApproach && typeof cv.closestApproach.timeTo!=='undefined') ? 
                cv.closestApproach.timeTo : null;
            this.app.debug('closestApproach: ');
            this.app.debug(this.app.data.vessels.closest);  
            this.updateAlarm('cpa', msg.result.value);
        }
        else { 
            this.updateAlarm('cpa', null);
            this.app.data.vessels.closest= {id: null, distance: null, timeTo: null, position: [0,0]}
        }  
    }
}