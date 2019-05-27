import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { GPX, GPXRoute, GPXWaypoint} from './gpx';
import { SKResources } from '../skresources/'

//** HomePage **
@Component({
    selector:	    'import-dialog',
    templateUrl: 	'./import-dialog.html',
    styleUrls: 	    ['./gpxload.css']
})
export class GPXImportDialog implements OnInit{

    public gpxData= {
        name: '',
        routes: [],
        waypoints: []
    }

    private skResources= {
        routes: [],
        waypoints: []
    }

    public selRoutes=[];
    public selectedRoute= null;
    public selWaypoints=[];  

    public display= {
        notValid: false,
        allRoutesChecked: false,
        allWaypointsChecked: false,
        someWptChecked: false,
        someRteChecked: false,       
        loadRoutesOK: false,
        loadWaypointsOK: false,
        routeViewer: false,
        selCount: { routes: 0, waypoints: 0 },
        expand: { routes: false, waypoints: false }
    }

    public gpx: GPX;
    
    constructor(
        private skres: SKResources,
        public dialogRef: MatDialogRef<GPXImportDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() {
        this.gpx= new GPX();
        this.data.fileData= this.data.fileData || null;
        this.parseFileData(this.data.fileData);
    } 

    parseFileData(data) {      
        this.gpxData.routes= [];
        this.gpxData.waypoints= [];      
        this.display.allRoutesChecked= false;
        this.display.loadRoutesOK= false;
        this.selRoutes= [];
        this.display.allWaypointsChecked= false;
        this.display.loadWaypointsOK= false;
        this.selWaypoints= []; 
        this.display.selCount= { routes: 0, waypoints: 0 }; 
        this.display.expand= { routes: false, waypoints: false };      

        this.display.notValid=false;
        if(!this.gpx.parse(data) ) { 
            console.warn('Selected file does not contain GPX data or\ndoes not correctly implement namespaced <extensions> attributes', 'Invalid GPX Data:');        
            this.display.notValid=true;
            return;
        }

        let idx=1;
        this.gpx.rte.forEach(r=> {           
            this.gpxData.routes.push( {
                name: (r['name']!='') ? r['name'] : `Rte: ${idx}`,
                description: (r['desc']) ? r['desc'] : (r['cmt']) ? r['cmt'] : '',
                wptcount: r['rtept'].length
            });
            this.selRoutes.push(false);
            idx++;
        });
        if(this.selRoutes.length==1) { 
            this.selRoutes[0]=true;
            this.display.allRoutesChecked=true;
            this.display.expand.routes= true;
            this.display.loadRoutesOK=true;
        }

        idx=1;
        this.gpx.wpt.forEach( w=> {
            this.gpxData.waypoints.push( {
                name: (w['name']) ? w['name'] :  `Wpt: ${idx}`,
                description: (w['desc']) ? w['desc'] : (w['cmt']) ? w['cmt'] : ''
            });
            this.selWaypoints.push(false);
            idx++;
        });        
        return true;       
    }

    // ** return selected resources to load **
    load() {
        for(let i=0; i<this.selRoutes.length; i++) {
            if(this.selRoutes[i]) { this.transformRoute(this.gpx.rte[i]) }
        }
        for(let i=0; i<this.selWaypoints.length; i++) {
            if(this.selWaypoints[i]) { 
                this.transformWaypoint(this.gpx.wpt[i]) }
        }        
        this.dialogRef.close( this.skResources );
    }
    
    // ** transform SKRoute from GPXRoute
    transformRoute(r: GPXRoute) {
        let skObj= this.skres.buildRoute( r.rtept.map( pt=> { return [pt.lon, pt.lat] }) );
        let rte= skObj.route[1];

        rte.name= r.name;
        rte.description= r.desc;
        // ** route properties **
        if(r.cmt) { rte.feature.properties['cmt']=r.cmt }
        if(r.src) { rte.feature.properties['src']=r.src }
        if(r.number) { rte.feature.properties['number']=r.number }
        if(r.type) { rte.feature.properties['type']=r.type }  

        this.skResources.routes.push( skObj.route );
        skObj.wptStart[1]['feature']['properties']['name']= `${r.name} start`;
        skObj.wptEnd[1]['feature']['properties']['name']= `${r.name} end`;
        this.skResources.waypoints.push( skObj.wptStart);
        this.skResources.waypoints.push( skObj.wptEnd);
    }    

    // **build SKWaypoint array from GPXWaypoint
    transformWaypoint(pt: GPXWaypoint) {
        let wptObj= this.skres.buildWaypoint([pt.lon, pt.lat]);
        let wpt= wptObj[1];
        if(pt.ele) { 
            wpt.feature.geometry.coordinates.push(pt.ele) 
            wpt.position['altitude']= pt.ele;
        }        
        if(pt.name && pt.name.length!=0) { wpt.feature.properties['name']=pt.name } 
        if(pt.desc && pt.desc.length!=0) { wpt.feature.properties['description']=pt.desc } 
        if(pt.cmt) { wpt.feature.properties['cmt']=pt.cmt }
        if(pt.geoidHeight) { wpt.feature.properties['geoidHeight']=pt.geoidHeight }
        if(pt.src) { wpt.feature.properties['src']=pt.src }
        if(pt.sym) { wpt.feature.properties['sym']=pt.sym }
        if(pt.type) { wpt.feature.properties['type']=pt.type }
        if(pt.fix) { wpt.feature.properties['fix']=pt.fix }
        if(pt.sat) { wpt.feature.properties['sat']=pt.sat }
        if(pt.hdop) { wpt.feature.properties['hdop']=pt.hdop }
        if(pt.vdop) { wpt.feature.properties['vdop']=pt.vdop }
        if(pt.pdop) { wpt.feature.properties['pdop']=pt.pdop }
        if(pt.ageOfGpsData) { wpt.feature.properties['ageOfGpsData']=pt.ageOfGpsData }
        if(pt.dgpsid) { wpt.feature.properties['dgpsid']=pt.dgpsid }

        this.skResources.waypoints.push( wptObj );     
    }      
   
    // ** select Route idx=-1 -> check all
    checkRte(checked, idx=-1) {
        let selcount=0;
        if(idx!=-1) {
            this.selRoutes[idx]= checked;
            this.display.loadRoutesOK= checked;
            for(let c of this.selRoutes) {
                if(c) { selcount++ }
            }
            this.display.loadRoutesOK=(selcount!=0) ? true : false;
            this.display.selCount.routes= selcount;  
            this.display.allRoutesChecked= (selcount==this.selRoutes.length);        
        }
        else {
            for(let i=0;i<this.selRoutes.length;i++) {
                this.selRoutes[i]=checked;
                this.display.loadRoutesOK=checked;
                this.display.allRoutesChecked=checked;
            }   
            this.display.selCount.routes= (checked) ? this.selRoutes.length : 0;         
        }
        this.display.someRteChecked= ( 
            this.display.allRoutesChecked || selcount==0) ? false : true;          
    }  
    
    // ** select Waypoint idx=-1 -> check all
    checkWpt(checked, idx=-1) {
        let selcount=0;
        if(idx!=-1) {
            this.selWaypoints[idx]= checked;
            this.display.loadWaypointsOK= checked;
            for(let c of this.selWaypoints) {
                if(c) { selcount++ }
            }
            this.display.loadWaypointsOK= (selcount!=0) ? true : false;
            this.display.selCount.waypoints= selcount;  
            this.display.allWaypointsChecked= (selcount==this.selWaypoints.length);        
        }
        else {
            for(let i=0;i<this.selWaypoints.length;i++) {
                this.selWaypoints[i]=checked;
                this.display.loadWaypointsOK=checked;
                this.display.allWaypointsChecked=checked;
            }   
            this.display.selCount.waypoints= (checked) ? this.selWaypoints.length : 0;         
        }
        this.display.someWptChecked= ( 
            this.display.allWaypointsChecked || selcount==0) ? false : true;         
    }   
       
}
