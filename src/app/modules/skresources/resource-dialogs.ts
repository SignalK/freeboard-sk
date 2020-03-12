/** Resource Dialog Components **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { SignalKClient } from 'signalk-client-angular';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

import { Convert } from 'src/app/lib/convert'
import { AppInfo } from 'src/app/app.info'
import { SKResources } from './resources.service';

/********* ResourceDialog **********
	data: {
        title: "<string>" title text,
        name: "<string>"resource name,
        comment: "<string>"resource comment,
    }
***********************************/
@Component({
	selector: 'ap-resourcedialog',
	template: `
        <div class="_ap-resource">
            <div>
                <h1 mat-dialog-title>{{data.title}}</h1>
            </div>
            <mat-dialog-content>
                <div style="display:flex;">
                    <div class="ap-confirm-icon">
                        <mat-icon color="primary">{{icon}}</mat-icon>
                    </div>
                    <div>                          
                        <div style="padding-left: 10px;">
                            <div>                                     
                                <mat-form-field hintLabel="Enter a Name">
                                    <input matInput #inpname="ngModel" 
                                        type="text" required
                                        placeholder="Resource Name"
                                        [disabled]="false"
                                        [(ngModel)]="data.name">
                                    <mat-error *ngIf="inpname.invalid && (inpname.dirty || inpname.touched)">
                                        Please enter a waypoint name
                                    </mat-error>
                                </mat-form-field>
                            </div>
                            <div>
                                <mat-form-field hintLabel="Enter a Description">
                                    <textarea matInput rows="2" #inpcmt="ngModel"
                                        placeholder="Resource Description"
                                        [(ngModel)]="data.comment">
                                    </textarea>
                                </mat-form-field>
                            </div>
                            <div *ngIf="data.position[0]" style="font-size: 10pt;">
                                <div style="display:flex;">
                                    <div style="width:45px;font-weight:bold;">Lat:</div>
                                    <div style="flex: 1 1 auto;">{{data.position[1]}}</div>
                                </div>
                                <div style="display:flex;">
                                    <div style="width:45px;font-weight:bold;">Lon:</div>
                                    <div style="flex: 1 1 auto;">{{data.position[0]}}</div>
                                </div>    
                            </div>                        
                        </div>                                
                    </div>                            
                </div>
            </mat-dialog-content>
            <mat-dialog-actions>
                <div style="text-align:center;width:100%;">
                    <button mat-raised-button color="primary" 
                        [disabled]="inpname.invalid"
                        (click)="dialogRef.close({result:true, data: data})">
                        SAVE
                    </button>
                    <button mat-raised-button (click)="dialogRef.close({result:false, data: data})">
                        CANCEL
                    </button>
                </div>					
            </mat-dialog-actions>
        </div>	
    `,
    styles: [`  ._ap-resource {
                    font-family: arial;
                    min-width: 300px;
                }
                .ap-confirm-icon { 
                    min-width: 35px;
                    max-width: 35px;
                    color: darkorange;
                    text-align: left;                    
                }
                .ap-confirm-icon .mat-icon { 
                    font-size: 25pt;
                }

                @media only screen
                    and (min-device-width : 768px)
                    and (max-device-width : 1024px),
                    only screen	and (min-width : 800px) { 
                    .ap-confirm-icon {
                        min-width: 25%;
                        max-width: 25%;
                    }
                    .ap-confirm-icon .mat-icon { 
                        font-size: 40pt;
                    }                    
                }                 	
			`]
})
export class ResourceDialog implements OnInit {
	public icon:string;

    constructor(
        public dialogRef: MatDialogRef<ResourceDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {
        this.data.name= this.data.name || '';
        this.data.comment= this.data.comment || '';
        this.data.title= this.data.title || '';
        this.data.position= this.data.position || [null,null];
        this.data.addMode= this.data.addMode || false;
        this.data.type= this.data.type || 'waypoint';

        this.icon= (this.data.type=='route') ? 'directions' : 
            (this.data.type=='note') ? 'local_offer' :
            this.data.addMode ? 'add_location' : 'edit_location';
    } 

}

/********* AISPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: "<SKVessel>" vessel,
        id: <string> vessel id
    }
***********************************/
@Component({
	selector: 'ap-ais-modal',
	template: `
        <div class="_ap-ais">
            <mat-toolbar>
                <span>
                    <mat-icon color="primary"> directions_boat</mat-icon>
                </span>
                <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
                    {{data.title}}
                </span>
                <span>
                    <button mat-icon-button (click)="modalRef.dismiss()"
                        matTooltip="Close" matTooltipPosition="below">
                        <mat-icon>keyboard_arrow_down</mat-icon>
                    </button>
                </span>
            </mat-toolbar>   

            <mat-card>
                <div style="display:flex;flex-direction: column;">
                    <div style="display:flex;">
                        <div class="key-label">Name:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.name}}</div>
                    </div>   
                    <div style="display:flex;">
                        <div class="key-label">MMSI:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.mmsi}}</div>
                    </div>                     
                    <div style="display:flex;" *ngIf="vInfo.flag">
                        <div class="key-label">Flag:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.flag}}</div>
                    </div>  
                    <div style="display:flex;" *ngIf="vInfo.port">
                        <div class="key-label">Port:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.port}}</div>
                    </div>                                             
                    <div style="display:flex;" *ngIf="vInfo.callsign">
                        <div class="key-label">Call sign:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.callsign}}</div>
                    </div>                       
                    <div style="display:flex;" *ngIf="vInfo.length">
                        <div class="key-label">Dimensions:</div>
                        <div style="flex: 1 1 auto;">
                            {{vInfo.length}} x {{vInfo.beam}}
                        </div>
                    </div>     
                    <div style="display:flex;" *ngIf="vInfo.draft">
                        <div class="key-label">Draft:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.draft}}</div>
                    </div>       
                    <div style="display:flex;" *ngIf="vInfo.height">
                        <div sclass="key-label">Height:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.height}}</div>
                    </div>                                        
                    <div style="display:flex;" *ngIf="vInfo.state">
                        <div class="key-label">State:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.state}}</div>
                    </div>                      
                    <div style="display:flex;" *ngIf="vInfo.destination">
                        <div class="key-label">Destination:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.destination}}</div>
                    </div>  
                    <div style="display:flex;" *ngIf="vInfo.eta">
                        <div class="key-label">ETA:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.eta.toLocaleString()}}</div>
                    </div>                                
                </div>
            </mat-card>
        </div>	
    `,
    styles: [`  ._ap-ais {
                    font-family: arial;
                } 
                ._ap-ais .key-label {
                    width:150px;
                    font-weight:bold;
                }             	
			`]
})
export class AISPropertiesModal implements OnInit {

    public target: any;
    public vInfo= {
        name: null,
        mmsi: null,
        callsign: null,
        length: null,
        beam: null,
        draft: null,
        height: null,
        shipType: null,
        destination: null,
        eta: null,
        state: null,
        flag: null,
        port: null
    }

    constructor(
        public app: AppInfo,
        private sk: SignalKClient,
        public modalRef: MatBottomSheetRef<AISPropertiesModal>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
    }
    
    ngOnInit() { 
        this.target= this.data.target;
        this.getVesselInfo();
    }

    formatDegrees(val: number) { 
        return (val ? `${Convert.radiansToDegrees(val).toFixed(1)} ${String.fromCharCode(186)}` : '0.0');
    }

    formatKnots(val: number) { 
        return (val ? `${Convert.msecToKnots(val).toFixed(1)} kn` : '0.0');
    }    

    private getVesselInfo() {
        let path: string;
        if(!this.data.id) { path='vessels/self' }
        else { path= this.data.id.split('.').join('/') }

        this.sk.api.get(path).subscribe(
            v=> { 
                if(typeof v['name']!=='undefined') { this.vInfo.name= v['name'] } 
                if(typeof v['mmsi']!=='undefined') { this.vInfo.mmsi= v['mmsi'] } 
                if(typeof v['flag']!=='undefined') { this.vInfo.flag= v['flag'] } 
                if(typeof v['port']!=='undefined') { this.vInfo.port= v['port'] } 
                if(typeof v['communication']!=='undefined') {
                    if(typeof v['communication']['callsignVhf']!=='undefined') {
                        this.vInfo.callsign= v['communication']['callsignVhf'];
                    }
                }                 
                if(typeof v['navigation']!=='undefined') {
                    if(typeof v['navigation']['destination']!=='undefined') {
                        if(typeof v['navigation']['destination']['commonName']!=='undefined') {
                            this.vInfo.destination= v['navigation']['destination']['commonName']['value'];
                        }                    
                        if(typeof v['navigation']['destination']['eta']!=='undefined') {
                            this.vInfo.eta= new Date(v['navigation']['destination']['eta']['value']).toUTCString();
                        } 
                    }
                    if(typeof v['navigation']['state']!=='undefined'
                            && typeof v['navigation']['state']['value']!=='undefined') {
                        this.vInfo.state= v['navigation']['state']['value'];
                    } 
                }                
                if(typeof v['design']!=='undefined') {
                    if(typeof v['design']['length']!=='undefined' 
                            && v['design']['length']['value']['overall']) {
                        this.vInfo.length= v['design']['length']['value']['overall'];
                    }
                    if(typeof v['design']['beam']!=='undefined') {
                        this.vInfo.beam= v['design']['beam']['value'];
                    }   
                    if(typeof v['design']['draft']!=='undefined' 
                            && v['design']['draft']['value']) {
                        if(typeof v['design']['draft']['value']['maximum']!=='undefined') {
                            this.vInfo.draft= `${v['design']['draft']['value']['maximum']} (max)`;
                        }       
                        else if(typeof v['design']['draft']['value']['current']!=='undefined') {
                            this.vInfo.draft= `${v['design']['draft']['value']['current']} (current)`;
                        }                        
                    }  
                    if(typeof v['design']['airHeight']!=='undefined') {
                        this.vInfo.height= v['design']['airHeight']['value'];
                    }                                     
                    if(typeof v['design']['aisShipType']!=='undefined') {
                        this.vInfo.shipType= v['design']['aisShipType']['value']['name'];
                    } 
                }

            }
        )
    }
	
}


/********* AtoNPropertiesModal **********
	data: {
        title: "<string>" title text,
        target: "<SKAtoN>" aid to navigation
    }
***********************************/
@Component({
	selector: 'ap-aton-modal',
	template: `
        <div class="_ap-aton">
            <mat-toolbar>
                <span>
                    <mat-icon color="primary"> beenhere</mat-icon>
                </span>
                <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
                    {{data.title}}
                </span>
                <span>
                    <button mat-icon-button (click)="modalRef.dismiss()"
                        matTooltip="Close" matTooltipPosition="below">
                        <mat-icon>keyboard_arrow_down</mat-icon>
                    </button>
                </span>
            </mat-toolbar>          

            <mat-card>
                <div style="display:flex;flex-direction: column;">
                    <div style="display:flex;">
                        <div class="key-label">Name:</div>
                        <div style="flex: 1 1 auto;">{{data.target.name}}</div>
                    </div>   
                    <div style="display:flex;">
                        <div class="key-label">MMSI:</div>
                        <div style="flex: 1 1 auto;">{{data.target.mmsi}}</div>
                    </div>    
                    <div style="display:flex;">
                        <div class="key-label">Type:</div>
                        <div style="flex: 1 1 auto;">{{data.target.type.name}}</div>
                    </div> 
                    <!--<div style="display:flex;" *ngFor="let p of data.target.properties | keyvalue">
                        <div class="key-label">{{p.key}}:</div>
                        <div style="flex: 1 1 auto;">{{p.value}}</div>
                    </div>-->
                    <signalk-details-list [details]=" data.target.properties"></signalk-details-list>          
                </div>
            </mat-card>
        </div>	
    `,
    styles: [`  ._ap-aton {
                    font-family: arial;
                    min-width: 300px;
                }
                ._ap-aton .key-label {
                    width:150px;
                    font-weight:bold;
                }                 	
			`]
})
export class AtoNPropertiesModal implements OnInit {

    public target: any;

    constructor(
        public modalRef: MatBottomSheetRef<AtoNPropertiesModal>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
    }
    
    ngOnInit() { 
        this.target= this.data.target;
    } 
	
}

/********* ActiveResourcePropertiesModal **********
	data: {
        title: "<string>" title text,
        type: 'dest' | 'route' resource type,
        resource: "<SKWaypoint | SKRoute>" active resource info
    }
***********************************/
@Component({
	selector: 'ap-dest-modal',
	template: `
        <div class="_ap-dest" style="display:flex;flex-direction:column;">
            <div>
                <mat-toolbar>
                    <span>
                        <mat-icon color="primary"> {{data.type=='point' ? 'flag' : 'directions'}}</mat-icon>
                    </span>
                    <span style="flex: 1 1 auto; padding-left:20px;text-align:center;
                                text-overflow: ellipsis;white-space: nowrap;
                                overflow: hidden;">
                        {{data.title}}
                    </span>
                    <span>
                        <button mat-icon-button (click)="modalRef.dismiss()"
                            matTooltip="Close" matTooltipPosition="below">
                            <mat-icon>keyboard_arrow_down</mat-icon>
                        </button>
                    </span>
                </mat-toolbar> 
            </div>         

            <div style="flex: 1 1 auto;position:relative;overflow:hidden;min-height:200px;">
                <div style="top:0;left:0;right:0;bottom:0;position:absolute;
                    overflow:auto;">
                    <mat-card *ngFor="let pt of points; let i=index;">
                        <div style="display:flex;" (click)="selectPoint(i)"
                            [style.cursor]="(points.length>1 && selIndex!=-1) ? 'pointer': 'initial'">
                            <div style="width:35px;">
                                <mat-icon color="warn" *ngIf="selIndex==i">flag</mat-icon>
                            </div>
                            <div style="flex: 1 1 auto;">
                                <div style="display:flex;">
                                    <div class="key-label">Lat:</div>
                                    <div style="flex: 1 1 auto;">{{pt[1]}}</div>
                                </div>   
                                <div style="display:flex;">
                                    <div class="key-label">Lon:</div>
                                    <div style="flex: 1 1 auto;">{{pt[0]}}</div>
                                </div> 
                            </div>                            
                        </div>
                    </mat-card>
                </div>
            </div>
        </div>	
    `,
    styles: [`  ._ap-dest {
                    font-family: arial;
                    min-width: 300px;
                }
                ._ap-dest .key-label {
                    width:50px;
                    font-weight:bold;
                }  
                ._ap-dest .selected {
                    background-color: silver;
                }                	
			`]
})
export class ActiveResourcePropertiesModal implements OnInit {

    public points: Array<[number,number]>= [];
    public selIndex:number=-1;

    constructor(
        public app: AppInfo,
        private skres: SKResources,
        public modalRef: MatBottomSheetRef<ActiveResourcePropertiesModal>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
    }
    
    ngOnInit() {
        console.log('data:', this.data);
        
        if(this.data.resource[1].feature && this.data.resource[1].feature.geometry.coordinates) {
            if(this.data.type=='route'){
                this.points= this.data.resource[1].feature.geometry.coordinates;
                this.data.title= (this.data.resource[1].name) ? `
                    ${this.data.resource[1].name} Points` : 'Route Points'; 
                if(this.data.resource[0]==this.app.data.activeRoute) {
                    this.selIndex= this.app.data.navData.pointIndex;
                }                    
            }
            else {
                if(this.app.data.activeRoute) {
                    let rte= this.app.data.routes.filter(i=> { 
                        return (i[0]==this.app.data.activeRoute) ? true : false;
                    })[0];
                    if(rte.length!=0) {
                        this.points= rte[1].feature.geometry.coordinates;
                        this.data.title= (rte[1].name) ? `${rte[1].name} Points` : 'Active Route Points';
                        this.selIndex= this.app.data.navData.pointIndex;
                    }
                }
                else { 
                    this.data.title= (this.data.title) ? this.data.title : 'Destination';
                    this.points= [this.data.resource[1].feature.geometry.coordinates];
                }
            }
        }
    } 

    selectPoint(idx:number) { 
        if(this.points.length<2 || this.selIndex<0) { return }
        let nextPoint= {
            latitude: this.points[idx][1], 
            longitude: this.points[idx][0], 
        }
        this.selIndex= idx;
        this.skres.setNextPoint(nextPoint);          
    }
	
}