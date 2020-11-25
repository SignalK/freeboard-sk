/// <reference lib="webworker" />

import { SignalKStreamWorker, Alarm, AlarmState } from 'signalk-worker-angular';
import { SKVessel, SKAtoN } from './modules/skresources/resource-classes';
import { Convert } from './lib/convert';
import { GeoUtils } from './lib/geoutils';

class WorkerMessageBase {
    action:string=null;
    playback:boolean= false;
    result:any= null;
}

class NotificationMessage extends WorkerMessageBase {
    type:string;
    constructor(type:string) {
        super();
        this.action= 'notification';
        this.type= type;
    }
}

class UpdateMessage extends WorkerMessageBase {
    timestamp:string;
    constructor() {
        super();
        this.action= 'update';
    }
}

// ** preference source paths **
const prefSourcePaths= [
    'environment.wind.speedTrue',
    'environment.wind.speedOverGround',
    'environment.wind.angleTrueGround',
    'environment.wind.angleTrueWater',    
    'environment.wind.directionTrue',
    'environment.wind.directionMagnetic',
    'navigation.courseOverGroundTrue',
    'navigation.courseOverGroundMagnetic',
    'navigation.headingTrue',
    'navigation.headingMagnetic'
];

let vessels;
let atons;
let stream:SignalKStreamWorker;
let unsubscribe:Array<any>= [];
let timers= [];
let updateReceived:boolean= false;

// ** settings **
let preferredPaths= {};
let msgInterval:number= 500;
let playbackMode:boolean= false;
let playbackTime:string;
let aisMgr= {
    maxAge: 540000,         // time since last update in ms (9 min)
    staleAge: 360000,       // time since last update in ms (6 min)
    lastTick: new Date().valueOf()
}


// *******************************************************************

function initVessels() {
    vessels= { 
        self: new SKVessel(), 
        aisTargets: new Map(),
        aisStatus: { updated:[], stale:[], expired:[] },
        paths: {},
        atons: new Map()
    }
    // flag to indicate at least one position data message received
    vessels.self['positionReceived']= false;
}

/** handle stream event and POST Message to App**
** stream event **
{ action: 'onConnect' | 'onClose' | 'onerror' | 'onMessage', msg: stream message }

** posted message **
{ 
    action: 'closed', 
    result: 'result / message'
} 
*/
function handleStreamEvent({action, msg}) {
    switch(action) {
        case 'onConnect':
            postMessage({
                action: 'open', 
                playback: playbackMode, 
                result: msg.target.readyState});
            break;
        case 'onClose':
            closeStream(false);
            break;
        case 'onError':
            console.warn(msg); 
            postMessage({
                action: 'error', 
                playback: playbackMode,
                result: 'Connection error!'});
            break;
        case 'onMessage':
            parseStreamMessage(msg)
            break;
    }
}

// ******** MESSAGE FROM APP ************
// ** listem for posted messages from APP
addEventListener('message', ({ data }) => { handleCommand(data) });

/** handle posted Message from APP: 
    { 
        cmd: 'open' | 'close' | 'subscribe' | 'settings' | 'alarm' | 'vessel',
        options: {..}
    }
 * **************************/
function handleCommand(data: any) {
    if(!data.cmd) { return }
    switch(data.cmd) {
        // { cmd: 'open', options: { url: string, subscribe: string, token: string} }       
        case 'open':
            console.log('Worker: opening stream...');
            applySettings(data.options);
            openStream(data.options);
            break;
        //** { cmd: 'close', options: {terminate: boolean} }       
        case 'close':
            console.log('Worker: closing stream...');
            closeStream(true);
            break;  
        //** { cmd: 'subscribe' , options: {context: string, path: Array<any>} }           
        case 'subscribe':
            console.log('Worker: subscribing to paths...');
            stream.subscribe(data.options.context, data.options.path);
            break;              
        //** { cmd: 'settings' , options: {..}              
        case 'settings':
            console.log('Worker: settings...');
            applySettings(data.options);
            break;   
        //** { cmd: 'alarm', options: {raise: boolean, type: string, msg: string, state: string} }       
        case 'alarm':
            console.log('Worker: alarm action...');
            actionAlarm(data.options);
            break;   
        //** { cmd: 'vessel', options: {context: string, name: string} }       
        case 'vessel':
            console.log('Worker: vessel setting...');
            if(data.options) {
                let v:SKVessel;
                if(data.options.context=='self') { v= vessels.self }
                else { v= vessels.aisTargets.get(data.options.context) }
                if(v && data.options.name) { v.name= data.options.name }
            }
            break;                                                        
    } 
}

function applySettings(opt:any={}) {
    if(opt.interval && typeof opt.interval==='number') { 
        msgInterval= opt.interval;
        clearTimers();
        startTimers();
    } 
    playbackMode= (opt.playback) ? true : false;
    if(opt.selections) {    // Preferred path selection
        if(typeof opt.selections.preferredPaths!=='undefined') { 
            preferredPaths= opt.selections.preferredPaths;
        }
    }
}

// **************************************

function closeStream(fromCommand:boolean=false, state?:number) {
    clearTimers();
    unsubscribe.forEach( i=> i.unsubscribe() );     
    if(stream && fromCommand) { stream.close() } 
    stream= null;
    postMessage({
        action: 'close', 
        result: fromCommand,
        playback: playbackMode
    });    
}

function openStream(opt:any) {
    if(stream) { return }
    if(!opt.url) { 
        postMessage({action: 'error', result: 'Valid options not provided!'});
        return;
    }
    initVessels();
    stream= new SignalKStreamWorker();     
    unsubscribe.push(stream.onConnect.subscribe( r=> handleStreamEvent(
        { action: 'onConnect', msg: r }
    ) ));
    unsubscribe.push(stream.onClose.subscribe( r=> handleStreamEvent(
        { action: 'onClose', msg: r }
    ) ));
    unsubscribe.push(stream.onError.subscribe( r=> handleStreamEvent(
        { action: 'onError', msg: r }
    ) ));
    unsubscribe.push(stream.onMessage.subscribe( r=> handleStreamEvent(
        { action: 'onMessage',  msg: r }
    ) ));    
    if(opt.playback) {
        //playback?subscribe=self&startTime=2018-08-24T15:19:09Z&playbackRate=5  
        let st= (opt.playbackOptions.startTime) ? `?startTime=${opt.playbackOptions.startTime}` : null;
        let pbr= (opt.playbackOptions.playbackRate) ? `playbackRate=${opt.playbackOptions.playbackRate}` : null;
        pbr= (pbr) ? ( (st) ? '&' + pbr :  '?' + pbr ) : null;
        let url = `${opt.url}${(st) ? st : ''}${(pbr) ? pbr : ''}`;
        stream.open(url, opt.playbackOptions.subscribe, opt.token);
    }   
    else { stream.open(opt.url, opt.subscribe, opt.token) }
}

function actionAlarm(opt:any) {
    let n= (opt.type.indexOf('notifications.')==-1) ? `notifications.${opt.type}` : opt.type;
    if(opt.raise) { // raise alarm
        stream.raiseAlarm('self', n, new Alarm(opt.message, opt.state, true, true) );
    }
    else { stream.clearAlarm('self', n) }  // clear alarm
}

// **************************************

// ** process Signal K message **
function parseStreamMessage(data:any) {

    if(stream.isHello(data)) {  // hello
        postMessage({
            action: 'hello', 
            result: data, 
            self: data.self, 
            playback: playbackMode 
        });
        if(msgInterval) { startTimers() }
    }    
    else if(stream.isDelta(data)) {  // update
        updateReceived= true;
        data.updates.forEach(u => {
            if(!u.values) { return }
            u.values.forEach( v=> {
                playbackTime= u.timestamp;
                if(data.context.indexOf('aton')!=-1) {  // aton
                    processAtoN(data.context, v);
                }
                else { // vessel
                    if(stream.isSelf(data)) { 
                        processVessel( vessels.self, v, true),
                        processNotifications(v);
                    }
                    else { // other vessel
                        vessels.aisStatus.updated.push(data.context);
                        processVessel( selectVessel(data.context), v);
                    }
                }
            });
        });
        postUpdate();
    }
    else if(stream.isResponse(data)) {   // request response
        postMessage({
            action: 'response', 
            result: data
        });
    }
}     

//** POST message to App**
function postUpdate(immediate:boolean=false) { 
    if(!msgInterval || immediate) {
        processAIS();
        let msg= new UpdateMessage();
        msg.playback= playbackMode;
        msg.result= vessels;
        msg.timestamp= (playbackMode) ? playbackTime : vessels.self.lastUpdated.toISOString();
        postMessage(msg); 
        vessels.aisStatus= { updated:[], stale:[], expired:[] };
        vessels.self.resourceUpdates= [];
    }
}

// **************************************

// ** start message timers
function startTimers() {
    if(msgInterval && typeof msgInterval=== 'number') { 
        timers.push( setInterval( ()=> { 
            if(updateReceived) {
                postUpdate(true);
                updateReceived=false;
            }
        }, msgInterval) ); 
    }
}

// ** clear message timers
function clearTimers() { 
    timers.forEach( t=> clearInterval(t) );
    timers= [];
}

// ********** Process vessel data *******

// ** return selected SKVessel from vessels.aisTargets
function selectVessel(id: string):SKVessel {
    if( !vessels.aisTargets.has(id) ) {
        let vessel= new SKVessel();
        vessel.position= null;
        vessels.aisTargets.set(id, vessel );
    }
    return vessels.aisTargets.get(id);         
}

// ** process common vessel data and true / magnetic preference **
function processVessel(d: SKVessel, v:any, isSelf:boolean=false) {

    d.lastUpdated= new Date();

    // ** record received preferred path names for selection
    if(isSelf) { 
        if(prefSourcePaths.indexOf(v.path)!=-1) { vessels.paths[v.path]= v.value } 
    }    

    if( v.path=='' ) { 
        if(typeof v.value.name!= 'undefined') { d.name= v.value.name }
        if(typeof v.value.mmsi!= 'undefined') { d.mmsi= v.value.mmsi }
        if(typeof v.value.buddy!= 'undefined') { d.buddy= v.value.buddy }
    } 
    if(v.path=='communication.callsignVhf') { d.callsign= v.value }

    if( v.path=='navigation.position') {
        if(isSelf) { d['positionReceived']=true }
        d.position= GeoUtils.normaliseCoords([ v.value.longitude, v.value.latitude]);
    }        
    if(v.path=='navigation.state') { d.state= v.value }
    if(v.path=='navigation.speedOverGround') { d.sog= v.value }

    // ** cog **
    if(v.path=='navigation.courseOverGroundTrue') { d.cogTrue= v.value }
    if(v.path=='navigation.courseOverGroundMagnetic') { d.cogMagnetic= v.value }

    // ** heading **
    if(v.path=='navigation.headingTrue' ) { d.headingTrue= v.value } 
    if(v.path=='navigation.headingMagnetic' ) { d.headingMagnetic= v.value }
    // ** ensure a value due to use in wind angle calc
    d.heading= (d.heading==null && d.cog!=null) ? d.cog : d.heading;

    // ** use preferred heading value for orientation **
    if(typeof preferredPaths['heading']!=='undefined' && v.path==preferredPaths['heading']) {
        d.orientation= v.value;
    }
        
    // ** environment.wind **
    if(v.path=='environment.wind.angleApparent') { d.wind.awa= v.value }
    if(v.path=='environment.wind.speedApparent') { d.wind.aws= v.value }

    // ** tws **
    if(v.path=='environment.wind.speedTrue') { d.wind.speedTrue= v.value }
    if(v.path=='environment.wind.speedOverGround') { d.wind.sog= v.value }
    
    // ** use preferred path value for tws **
    if(typeof preferredPaths['tws']!=='undefined' && v.path==preferredPaths['tws']) {
        d.wind.tws= v.value;
    }

    // ** wind direction **
    if(v.path=='environment.wind.directionTrue') { d.wind.twd= v.value }
    if(v.path=='environment.wind.directionMagnetic') { d.wind.mwd= v.value }

    // ** use preferred path value for twd **
    if(typeof preferredPaths['twd']!=='undefined' && v.path==preferredPaths['twd']) {
        d.wind.direction= (v.path=='environment.wind.angleTrueGround' || v.path=='environment.wind.angleTrueWater') 
            ? Convert.angleToDirection(v.value, d.heading)
            : v.value;    
    }     
    
    // ** environment.mode
    if(v.path=='environment.mode') { d.mode= v.value }

    if(v.path.indexOf('navigation.courseRhumbline')!=-1 
            || v.path.indexOf('navigation.courseGreatCircle')!=-1)  { 
        d['course.' + v.path.split('.').slice(2).join('.')]= v.value;
    } 

    // ** closest approach **
    if(v.path.indexOf('navigation.closestApproach')!=-1) { d.closestApproach= v.value }   

    // ** anchor radius / position **
    if(v.path=='navigation.anchor.position') { d.anchor.position= v.value }
    if(v.path=='navigation.anchor.maxRadius') { d.anchor.maxRadius= v.value }
    if(v.path=='navigation.anchor.currentRadius') { d.anchor.radius= v.value }

    // ** resource deltas **
    if(v.path.indexOf('resources.')!=-1) { d.resourceUpdates.push(v) } 

    // ** steering.autopilot **
    if(v.path=='steering.autopilot.state') { d.autopilot.state= v.value }
    if(v.path=='steering.autopilot.mode') { d.autopilot.mode= v.value } 

}

// ** process notification messages **
function processNotifications(v:any, vessel?:string) {
    let data= { path: v.path, value: v.value, context: vessel || null };
    let type: string;
    let seg= v.path.split('.');

    // ** Depth **
    if( v.path=='notifications.environment.depth.belowTransducer' ||
        v.path=='notifications.environment.depth.belowSurface' ||
        v.path=='notifications.environment.depth.belowKeel') {
            type= seg[2];
    }                                        
    
    // ** Anchor **
    if(v.path=='notifications.navigation.anchor') { type= seg[2] } 
    
    // ** Standard Alarms **
    if( ['mob','sinking','fire','piracy','flooding', 'collision',
        'grounding','listing','adrift','abandon'].indexOf( seg[seg.length-1] )!=-1) { 
            type= seg[seg.length-1];
    } 

    // ** closest Approach **
    if(v.path.indexOf('notifications.navigation.closestApproach')!=-1) {
        type= seg[2];
        data.context= seg[3];
    } 

    // ** Buddy **
    if(v.path.indexOf('notifications.buddy')!=-1) {
        type= seg[1];
        data.context= seg[2];
    } 
    
    // ** arrivalCircle **
    if(v.path.indexOf('notifications.arrivalCircleEntered')!=-1) {
        type= seg[1];
        data.context= seg[2];
    }
    
    if(type) { 
        let msg= new NotificationMessage(type);
        msg.playback= playbackMode;
        msg.result= data;
        postMessage(msg); 
    } 
    
}

// ** process / cleanup stale / obsolete AIS targets
function processAIS() {
    let now= new Date().valueOf();
    vessels.aisTargets.forEach( (v, k)=> {
        //if not present then mark for deletion
        if(v.lastUpdated< (now-aisMgr.maxAge) ) {
            vessels.aisStatus.expired.push(k);
            vessels.aisTargets.delete(k);
        }
        else if(v.lastUpdated< (now-aisMgr.staleAge) ) { //if stale then mark inactive
            vessels.aisStatus.stale.push(k); 
        } 
    });
}

// process AtoN values
function processAtoN(id:string, v:any) {
    if( !vessels.atons.has(id) ) {
        let aton= new SKAtoN();
        aton.id= id;
        aton.position= null;
        vessels.atons.set(id, aton );
    }
    let d= vessels.atons.get(id);        
    if( v.path=='' ) { 
        if(typeof v.value.name!= 'undefined') { d.name= v.value.name }
        if(typeof v.value.mmsi!= 'undefined') { d.mmsi= v.value.mmsi }
        if(typeof v.value.atonType!= 'undefined') { d.type= v.value.atonType }
    } 
    else if(v.path=='atonType') { d.type= v.value }
    else if( v.path=='navigation.position') {
        d.position= [ v.value.longitude, v.value.latitude];                      
    } 
    else { d.properties[v.path]= v.value }  
}
