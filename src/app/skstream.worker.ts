/// <reference lib="webworker" />

import { SignalKStreamWorker, Alarm, AlarmState } from 'signalk-worker-angular';
import { SKVessel } from './modules/skresources/resource-classes';

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


let vessels;
let stream:SignalKStreamWorker;
let unsubscribe:Array<any>= [];
let timers= [];
let updateReceived:boolean= false;

// ** settings **
let msgInterval:number= 1000;
let useMagnetic:boolean= false;
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
        aisStatus: { updated:[], stale:[], expired:[] }
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
        cmd: 'open' | 'close' | 'subscribe' | 'settings' | 'alarm',
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
        //** { cmd: 'settings' , options: {useMagnetic: boolean, interval: number} }              
        case 'settings':
            console.log('Worker: settings...');
            applySettings(data.options);
            break;   
        //** { cmd: 'alarm', options: {raise: boolean, type: string, msg: string, state: string} }       
        case 'alarm':
            console.log('Worker: alarm action...');
            actionAlarm(data.options);
            break;                                             
    } 
}

function applySettings(opt:any={}) {
    if(typeof opt.useMagnetic!=='undefined') { useMagnetic= opt.useMagnetic }
    if(opt.interval && typeof opt.interval==='number') { 
        msgInterval= opt.interval;
        clearTimers();
        startTimers();
    } 
    playbackMode= (opt.playback) ? true : false;   
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
            u.values.forEach( v=> {
                playbackTime= u.timestamp;
                if(stream.isSelf(data)) { 
                    processVessel( vessels.self, v, true),
                    processNotifications(v);
                }
                else { 
                    vessels.aisStatus.updated.push(data.context);
                    processVessel( selectVessel(data.context), v);
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

// ** process comon vessel data and true / magnetic preference **
function processVessel(d: SKVessel, v:any, isSelf:boolean=false) {

    d.lastUpdated= new Date();

    if( v.path=='' ) { 
        if(typeof v.value.name!= 'undefined') { d.name= v.value.name }
        if(typeof v.value.mmsi!= 'undefined') { d.mmsi= v.value.mmsi }
        if(typeof v.value.buddy!= 'undefined') { d.buddy= v.value.buddy }
    } 

    if(v.path=='navigation.courseOverGroundTrue') { 
        d.cogTrue= v.value;
        if(!useMagnetic) { d.cog= v.value }
    }
    if(v.path=='navigation.courseOverGroundMagnetic') { 
        d.cogMagnetic= v.value;
        if(useMagnetic) { d.cog= v.value }
    }

    if( v.path=='navigation.headingTrue' ) { 
        d.headingTrue= v.value;
        if(!useMagnetic) { d.heading= v.value }
    } 
    if( v.path=='navigation.headingMagnetic' ) { 
        d.headingMagnetic= v.value;
        if(useMagnetic) { d.heading= v.value }         
    }

    d.orientation= (d.heading!=null) ? d.heading : 
        (d.cog!=null) ? d.cog : 0;

    if(v.path=='navigation.speedOverGround') { d.sog= v.value }
    if( v.path=='navigation.position') {
        if(isSelf) { d['positionReceived']=true }
        d.position= [ v.value.longitude, v.value.latitude];                      
    }        
    if(v.path=='navigation.state') { d.state= v.value }
    if(v.path=='communication.callsignVhf') { d.callsign= v.value }  

    if(v.path=='environment.wind.angleTrueGround' || v.path=='environment.wind.angleTrueWater') { 
        d.wind.twd= v.value;
    }   
    if(v.path=='environment.wind.directionTrue') { d.wind.twd= v.value }
    if(!useMagnetic && typeof d.wind.twd!=='undefined') { d.wind.direction= d.wind.twd }

    if(v.path=='environment.wind.directionMagnetic') { 
        d.wind.mwd= v.value;
        if(useMagnetic) { d.wind.direction= v.value }
    }
    if(v.path=='environment.wind.speedTrue') { d.wind.tws= v.value }
    if(v.path=='environment.wind.angleApparent') { d.wind.awa= v.value }
    if(v.path=='environment.wind.speedApparent') { d.wind.aws= v.value }

    if(v.path.indexOf('navigation.courseRhumbline')!=-1 
            || v.path.indexOf('navigation.courseGreatCircle')!=-1)  { 
        d['course.' + v.path.split('.').slice(2).join('.')]= v.value;
    } 

    if(v.path.indexOf('navigation.closestApproach')!=-1) {   
        d.closestApproach= v.value
    }   
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