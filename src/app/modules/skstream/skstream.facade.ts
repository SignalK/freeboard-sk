/** Signal K Stream Provider abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamProvider } from './skstream.service';
import { SKVessel } from '../skresources/resource-classes';
import { AlarmsFacade } from '../alarms/alarms.facade';
import { Convert } from 'src/app/lib/convert';
import { SKResources } from '../skresources';


export enum SKSTREAM_MODE { REALTIME=0, PLAYBACK }

@Injectable({ providedIn: 'root' })
export class SKStreamFacade  {

   // **************** ATTRIBUTES ***************************
    private onConnect:Subject<any>= new Subject();
    private onClose:Subject<any>= new Subject();
    private onError:Subject<any>= new Subject();
    private onMessage:Subject<any>= new Subject();
    private onSelfTrail:Subject<any>= new Subject();
    private vesselsUpdate:Subject<any>= new Subject();
    private navDataUpdate:Subject<any>= new Subject();
   // *******************************************************    

    constructor(private app: AppInfo, 
                private signalk: SignalKClient,
                private alarmsFacade: AlarmsFacade,
                private skres: SKResources,
                private stream: SKStreamProvider) {

        // ** SIGNAL K STREAM **
        this.stream.message$().subscribe(
            (msg:any)=> {
                if(msg.action=='open') { 
                    this.post({ 
                        cmd: 'auth',
                        options: { 
                            token: this.app.getToken()
                        }
                    });
                    this.onConnect.next(msg);
                }  
                else if(msg.action=='close') { this.onClose.next(msg) }  
                else if(msg.action=='error') { this.onError.next(msg) }
                else if(msg.action=='trail') { 
                    this.parseSelfTrail(msg);
                }
                else { 
                    this.onMessage.next(msg);
                    this.parseUpdate(msg);
                }                             
            }
        );

        // ** SETTINGS - handle settings load / save events
        this.app.settings$.subscribe( r=> this.handleSettingsEvent(r) );        

    }
    // ** SKStream WebSocket messages **
    connect$(): Observable<any> { return this.onConnect.asObservable() }
    close$(): Observable<any> { return this.onClose.asObservable() }
    error$(): Observable<any> { return this.onError.asObservable() }
    delta$(): Observable<any> { return this.onMessage.asObservable() }
    trail$(): Observable<any> { return this.onSelfTrail.asObservable() }

    // ** Data centric messages
    vessels$(): Observable<any> { return this.vesselsUpdate.asObservable() }
    navdata$(): Observable<any> { return this.navDataUpdate.asObservable() }


    terminate() { this.stream.terminate() }

    close() { this.stream.close() }

    post(msg:any) { this.stream.postMessage(msg) }

    // ** open Signal K Stream 
    open(options:any=null, toMode: SKSTREAM_MODE=SKSTREAM_MODE.REALTIME) {
        if(options && options.startTime) { 
            let url= this.signalk.server.endpoints['v1']['signalk-ws'].replace('stream', 'playback');
            this.stream.postMessage({ 
                cmd: 'open',
                options: { 
                    url: url,
                    subscribe: 'none',
                    token: null,
                    playback: true,
                    playbackOptions: options
                }
            });                  
        }
        else {
            this.stream.postMessage({ 
                cmd: 'open',
                options: { 
                    url: this.signalk.server.endpoints['v1']['signalk-ws'],
                    subscribe: 'none',
                    token: null
                }
            });                            
        }
    }

    // ** subscribe to signal k paths
    subscribe() {
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: 'vessels.*',
                path: [
                    {"path":"","period":1000,"policy":'fixed'},
                    {"path":"buddy","period":1000,"policy":'fixed'},
                    {"path":"uuid","period":1000,"policy":'fixed'},
                    {"path":"name","period":1000,"policy":'fixed'},
                    {"path":"communication.callsignVhf","period":1000,"policy":'fixed'},
                    {"path":"mmsi","period":1000,"policy":'fixed'},
                    {"path":"port","period":1000,"policy":'fixed'},
                    {"path":"flag","period":1000,"policy":'fixed'},
                    {"path":"navigation.*","period":1000,"policy":'fixed'},
                    {"path":"environment.wind.*","period":1000,"policy":'fixed'},
                    {"path":"environment.mode","period":1000,"policy":'fixed'},
                    {"path":"resources.*","period":1000,"policy":'fixed'},
                    {"path":"steering.autopilot.*","period":1000,"policy":'fixed'}
                ]
            }
        });
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: "vessels.self",
                path: [
                    {"path":"notifications.*","period":1000}
                ]
            }
        });
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: "atons.*",
                path: [
                    {"path":"*","period":60000}
                ]
            }
        });
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: "shore.basestations.*",
                path: [
                    {"path":"*","period":60000}
                ]
            }
        });     
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: "sar.*",
                path: [
                    {"path":"*","period":60000}
                ]
            }
        });    
        this.stream.postMessage({
            cmd: 'subscribe',
            options: {
                context: "aircraft.*",
                path: [
                    {"path":"*","period":30000}
                ]
            }
        });               
    }

    // ** process selfTrail message from worker and emit trail$ **
    parseSelfTrail(msg:any) {
        if( msg.result) {
            if(!this.app.data.serverTrail) { this.app.data.serverTrail = true }
            this.onSelfTrail.next({action: 'get', mode: 'trail', data: msg.result });
        } else {
            console.warn('Unable to fetch vessel trail from server.');
            this.app.data.serverTrail= false;
        }
    }

    // ** parse delta message and update Vessel Data -> vesselsUpdate.next()
    private parseUpdate(msg:any) {
        if(msg.action=='update') { // delta message

            this.parseVesselSelf(msg.result.self);

            this.parseVesselOther(msg.result.aisTargets);    
            
            this.app.data.vessels.prefAvailablePaths= msg.result.paths;

            // ** update active vessel map display **
            this.app.data.vessels.active= (this.app.data.vessels.activeId) ?
                this.app.data.vessels.aisTargets.get(this.app.data.vessels.activeId) :
                this.app.data.vessels.self;

            this.processCourse(this.app.data.vessels.active);

            // process AtoNs
            this.app.data.atons= msg.result.atons;

            // process SaR
            this.app.data.sar= msg.result.sar;

            // process Aircraft
            this.app.data.aircraft= msg.result.aircraft;

            // processAIS
            this.app.data.aisMgr.updateList= msg.result.aisStatus.updated;
            this.app.data.aisMgr.staleList= msg.result.aisStatus.stale;
            this.app.data.aisMgr.removeList= msg.result.aisStatus.expired; 

            // process AIS tracks
            this.app.data.aisMgr.updateList.forEach( id=> {
                let v= id.indexOf('aircraft')!=-1 ?
                    this.app.data.aircraft.get(id) :
                    this.app.data.vessels.aisTargets.get(id);
                if(v) {
                    this.app.data.vessels.aisTracks.set(id, v.track);
                }
            });
            this.app.data.aisMgr.removeList.forEach( id=> {
                this.app.data.vessels.aisTracks.delete(id);
            });
            
            this.vesselsUpdate.next();
        }
    }

    private parseVesselSelf(v:SKVessel) {
        this.app.data.vessels.self= v;
        this.processVessel(this.app.data.vessels.self);
        this.alarmsFacade.updateAnchorStatus();             
    }

    private parseVesselOther(otherVessels:any) {
        this.app.data.vessels.aisTargets= otherVessels;
        this.app.data.vessels.aisTargets.forEach( (value, key)=> {
            this.processVessel(value);
            value.wind.direction= (this.app.useMagnetic) ? value.wind.mwd : value.wind.twd;
            value.orientation= (value.heading!=null) ? value.heading : (value.cog!=null) ? value.cog : 0;
            if(`vessels.${this.app.data.vessels.closest.id}`==key) { 
                if(!value.closestApproach) { 
                    this.alarmsFacade.updateAlarm('cpa', null);
                    this.app.data.vessels.closest= {id: null, distance: null, timeTo: null, position: [0,0]}
                }
                else { this.app.data.vessels.closest.position= value.position }
            }
        });
    }

    // ** process vessel data and true / magnetic preference **
    private processVessel(d:SKVessel) { 
        d.cog= (this.app.useMagnetic) ? d.cogMagnetic : d.cogTrue;
        d.heading= (this.app.useMagnetic) ? d.headingMagnetic : d.headingTrue;
    }

    // ** process course data
    private processCourse(v: SKVessel) {
        // ** active route **
        if(typeof v['course.activeRoute.href']!=='undefined') { 
            this.processActiveRoute(v['course.activeRoute.href']);    
        }
        
        // ** course **
        if(typeof v['course.crossTrackError']!=='undefined') {
            this.app.data.navData.xte= (this.app.config.units.distance=='m') ? 
                v['course.crossTrackError']/1000 : 
                Convert.kmToNauticalMiles(v['course.crossTrackError']/1000);                  
        }

        // ** nextPoint **
        if(typeof v['course.nextPoint.position']!=='undefined') {
            let np= (v['course.nextPoint.position']) ?
                [ v['course.nextPoint.position'].longitude, v['course.nextPoint.position'].latitude ] 
                : null;

            if(!np && !this.app.data.navData.position) { }
            else {
                this.app.data.navData.position= np;
                if(this.app.data.activeRoute && this.app.data.navData.position) {
                    this.setNavData( this.skres.getActiveRouteCoords() );
                }
            }
        }           
        if(typeof v['course.nextPoint.distance']!=='undefined') {  
            this.app.data.navData.dtg= (this.app.config.units.distance=='m') ? 
            v['course.nextPoint.distance']/1000 : 
            Convert.kmToNauticalMiles(v['course.nextPoint.distance']/1000);                
        }
        if(typeof v['course.nextPoint.bearingTrue']!=='undefined') { 
            this.app.data.navData.bearingTrue= Convert.radiansToDegrees(v['course.nextPoint.bearingTrue']);
            if(!this.app.useMagnetic) {
                this.app.data.navData.bearing.value= this.app.data.navData.bearingTrue;
                this.app.data.navData.bearing.type= 'T';
            } 
        }
        if(typeof v['course.nextPoint.bearingMagnetic']!=='undefined') { 
            this.app.data.navData.bearingMagnetic= Convert.radiansToDegrees(v['course.nextPoint.bearingMagnetic']);
            if(this.app.useMagnetic) {
                this.app.data.navData.bearing.value= this.app.data.navData.bearingMagnetic;
                this.app.data.navData.bearing.type= 'M';
            }                 
        }
        if(typeof v['course.nextPoint.velocityMadeGood']!=='undefined') {  
            this.app.data.navData.vmg= v['course.nextPoint.velocityMadeGood'];
        }
        if(typeof v['course.nextPoint.timeToGo']!=='undefined') { 
            this.app.data.navData.ttg= v['course.nextPoint.timeToGo']/60;
        }
        // ** experimental: paths not in spec - estimatedTimeOfArrival**
        if(typeof v['course.nextPoint.estimatedTimeOfArrival']!=='undefined') { 
            let d= new Date(v['course.nextPoint.estimatedTimeOfArrival']);
            this.app.data.navData.eta= (d instanceof Date && !isNaN(d as any)) ? d : null;
        } 
        // ** experimental: paths not in spec - arrivalCircle **
        if(typeof v['course.nextPoint.arrivalCircle']!=='undefined') { 
            this.app.data.navData.arrivalCircle= v['course.nextPoint.arrivalCircle'];
        }

        // ** previousPoint **
        if(typeof v['course.previousPoint.position']!=='undefined') {
            let np= (v['course.previousPoint.position']) ?
                [ v['course.previousPoint.position'].longitude, v['course.previousPoint.position'].latitude ] 
                : null;
            this.app.data.navData.startPosition= np;
        } 
        
        this.navDataUpdate.next();
    }  
       
    // ** set active route / update route array **
    public processActiveRoute(value: any) {
        let car: string;
        if(!value) { car= null }
        else {
            let a= value.split('/');
            car= a[a.length-1];
        }
        if(car== this.app.data.activeRoute) { return }
        this.app.data.activeRoute= car; 
        if(car) { this.app.data.activeWaypoint= null } 
        this.setNavData( this.skres.getActiveRouteCoords() );
    }

    // ** set the nextPoint position from supplied coordinates list
    public setNavData(coords: Array<[number,number]>) {
        let idx=-1;
        if(this.app.data.navData.position) {
            for(let i=0; i<coords.length; i++) {
                if(coords[i][0]==this.app.data.navData.position[0] &&
                    coords[i][1]==this.app.data.navData.position[1] ) {
                    idx=i;
                }
            }   
        } 
        this.app.data.navData.pointTotal= coords.length;
        this.app.data.navData.pointIndex= idx;
    }    

    // handle settings (config.selections)
    private handleSettingsEvent(value:any) {
        if(value.setting=='config') {
            //console.log('streamFacade.settingsEvent');
            this.stream.postMessage({ 
                cmd: 'settings',
                options: { selections: this.app.config.selections }
            });
        }        
    }
}