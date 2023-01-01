/** Trail2Route Dialog Component **
********************************/

import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SimplifyAP } from 'simplify-ts';
import { SKRoute } from 'src/app/modules/skresources/resource-classes';
import { SKResources } from 'src/app/modules/skresources//resources.service';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { GeoUtils } from 'src/app/lib/geoutils';
import { AppInfo } from 'src/app/app.info';

/********* Trail2RouteDialog **********
	data: {
    }
***********************************/
@Component({
	selector: 'ap-trail2routedialog',
	templateUrl: `./trail2route.html`,
    styles: [`  ._ap-trail2route {
                    font-family: arial;
                    min-width: 300px;
                }               	
			`]
})
export class Trail2RouteDialog implements OnInit {

    rteFromTrail: any[];
    mapCenter= [0,0];
    pointCount = 0;
    incServer = false;

    tolerance: number = 0.000001;
    highQuality: boolean = true;

    mapControls= [
        { name: 'zoom' }
    ];

    private obsList: Array<any>= [];
    //public serverTrail: Array<any>= [];
    private fetching: boolean =false;
    private serverCoords: Array<any>= [];

    constructor(
        private skres: SKResources,
        public app: AppInfo,
        private stream: SKStreamFacade,
        public dialogRef: MatDialogRef<Trail2RouteDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {
        this.parseTrail(true);
        //this.obsList.push( this.skres.update$().subscribe( value=> this.onServerResource(value) ) );
        this.obsList.push(this.stream.trail$().subscribe( (value)=> this.onServerResource(value) ));
        this.getServerTrail(this.app.config.selections.trailFromServer);
    }

    ngOnDestroy() {
        this.obsList.forEach( i=> i.unsubscribe() );
    }

    changeTolerance(val:number) {
        this.tolerance= val;
        this.parseTrail();
    }

    parseTrail(center?: boolean) {
        let trail= [].concat(this.data.trail ?? []);
        if(this.incServer) {
            //trail= trail.concat(this.serverCoords);
            trail= [].concat(this.serverCoords, trail);
        }
        let rteCoords= SimplifyAP(trail, this.tolerance, this.highQuality);
        this.pointCount= rteCoords.length;
        if(center) { this.mapCenter= rteCoords[Math.floor(rteCoords.length/2)] };
        let rte= new SKRoute();
        rte.feature.geometry.coordinates= rteCoords;
        this.rteFromTrail= [
            ['rtefromtrail', rte, true]
        ];
    }

    doClose(save: boolean) {
        let coords= [];
        if(save) {
            coords= this.rteFromTrail[0][1].feature.geometry.coordinates;
        }
        this.dialogRef.close({result: save, data: coords})
    }

    // retrieve trail from server
    getServerTrail(checked:boolean) { 
        this.incServer = checked;
        if(checked) {
            if(!this.app.config.selections.trailFromServer || this.serverCoords.length === 0) {
                this.fetching= true;
                this.skres.getVesselTrail();
            } else {
                this.parseTrail(true);
            }
        }
        else {
            this.parseTrail(true);
        }
    }

    // get server trail event handler
    onServerResource(value: any) {
        let serverTrail: Array<any>= [];
        if(this.fetching && value.action=='get' && value.mode=='trail') {
            this.fetching=false;
            serverTrail= value.data;
            /*serverTrail= value.data.map( line=> {
                return GeoUtils.mapifyCoords(line);
            });*/
            this.serverCoords= [];
            serverTrail.forEach( line=> {
                this.serverCoords= this.serverCoords.concat(line);
            });
            this.parseTrail();
        }
    }

}