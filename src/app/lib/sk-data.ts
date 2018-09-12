import { Injectable } from '@angular/core';

import { AppInfo } from '../app.info';



// ** Signal K received data operations
@Injectable({ providedIn: 'root' })
export class SKData {

    constructor(public app: AppInfo) { }

    parse(data) {
        if(!data.context) { 
            if(data.self) { this.app.data.selfId= data.self }
            return;
        }
        // ** delta message **
        let vid= data.context;
        if( !this.app.data.vessels.has(vid) ) {
            this.app.data.vessels.set(vid, {});
        }
        let vdata= this.app.data.vessels.get(vid);
        data.updates.forEach( u=> {
            u.values.forEach( v=> { vdata[v.path]= v.value });
        });
    }

    // ** return SKVessel object for supplied vessel data
    getVesselData(value, key): SKVessel {
        let v= new SKVessel();

        v.id= ( key==this.app.data.selfId ) ? 'self' : key;
        v.position= value['navigation.position'] ?
            v.position= [
                value['navigation.position'].longitude,
                value['navigation.position'].latitude
            ] : [0,0];
        v.headingTrue= value['navigation.headingTrue'] ? value['navigation.headingTrue'] : null;
        v.headingMagnetic= value['navigation.headingMagnetic'] ? value['navigation.headingMagnetic'] : null;
        v.callsign= value['communication.callsignVhf'] ? value['communication.callsignVhf'] : null;
        v.cogTrue= value['navigation.courseOverGroundTrue'] ? value['navigation.courseOverGroundTrue'] : null;
        v.sog= value['navigation.speedOverGround'] ? value['navigation.speedOverGround'] : null;  
        v.state= value['navigation.state'] ? value['navigation.state'] : null;  
        v.wind.twd= value['environment.wind.directionTrue'] ?  value['environment.wind.directionTrue'] : null;
        v.wind.awa=  value['environment.wind.angleApparent'] ? value['environment.wind.angleApparent'] : null;
        v.wind.tws= value['environment.wind.speedTrue'] ?  value['environment.wind.speedTrue'] : null;
        v.wind.aws=  value['environment.wind.speedApparent'] ? value['environment.wind.speedApparent'] : null;
                
        return v;
    }    
}

// ** Vessel Data **
export class SKVessel {
    id: string;
    position= [0,0];
    heading: number=0;
    headingTrue: number= 0;
    headingMagnetic: number= 0;
    cogTrue: number;
    sog: number;
    name: string;
    mmsi: string;
    callsign: string; 
    state: string;   
    wind= { twd: null, tws: null, awa: null, aws: null };
}


