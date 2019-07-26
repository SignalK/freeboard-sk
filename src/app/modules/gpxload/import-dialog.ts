import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

//import { GPX, GPXRoute, GPXWaypoint} from './gpx';
//import { SKResources } from '../../lib/skresources/'
import { GPXLoadFacade } from './gpxload.facade'

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

    private unsubscribe= [];
    
    constructor(
        public facade: GPXLoadFacade,
        public dialogRef: MatDialogRef<GPXImportDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
    ngOnInit() {
        this.data.fileData= this.data.fileData || null;
        this.parseGPXData(this.data.fileData);

        // ** close dialog returning error count **
        this.unsubscribe.push(
            this.facade.uploaded$.subscribe( errCount=> {
                this.dialogRef.close( errCount );
            })
        );
    } 

    ngOnDestroy() { 
        this.unsubscribe.forEach( i=> i.unsubscribe() );
        this.facade.clear();
     }

    // ** load selected resources **
    load() {
        this.facade.uploadToServer( {
            rte: { selected: this.selRoutes },
            wpt: { selected: this.selWaypoints }
        });
    }      

    parseGPXData(data) {          
        this.display.allRoutesChecked= false;
        this.display.loadRoutesOK= false;
        this.selRoutes= [];
        this.display.allWaypointsChecked= false;
        this.display.loadWaypointsOK= false;
        this.selWaypoints= []; 
        this.display.selCount= { routes: 0, waypoints: 0 }; 
        this.display.expand= { routes: false, waypoints: false };      
        this.display.notValid=false;

        this.gpxData= this.facade.parseFileData(data); 
        if(!this.gpxData) { 
            console.warn('Selected file does not contain GPX data or\ndoes not correctly implement namespaced <extensions> attributes', 'Invalid GPX Data:');        
            this.display.notValid=true;
            return;
        }

        this.gpxData.routes.forEach( r=> { this.selRoutes.push(false) });
        if(this.selRoutes.length==1) { 
            this.selRoutes[0]=true;
            this.display.allRoutesChecked=true;
            this.display.expand.routes= true;
            this.display.loadRoutesOK=true;
        }

        this.gpxData.waypoints.forEach( w=> { this.selWaypoints.push(false) });     
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
