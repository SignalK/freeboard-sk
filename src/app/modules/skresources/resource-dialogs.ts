/** Resource Dialog Components **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { SignalKClient } from 'signalk-client-angular';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Convert } from 'src/app/lib/convert'
import { AppInfo } from 'src/app/app.info'

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

/********* AISPropertiesDialog **********
	data: {
        title: "<string>" title text,
        target: "<SKVessel>" vessel,
        id: <string> vessel id
    }
***********************************/
@Component({
	selector: 'ap-aisdialog',
	template: `
        <div class="_ap-ais">
            <div>
                <h1 mat-dialog-title>
                    <mat-icon class="ap-confirm-icon" color="primary">directions_boat</mat-icon>
                    {{data.title}}
                </h1>
            </div>
            <mat-dialog-content>
                <div style="display:flex;flex-direction: column;">
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">Name:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.name}}</div>
                    </div>   
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">MMSI:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.mmsi}}</div>
                    </div>                     
                    <div style="display:flex;" *ngIf="vInfo.flag">
                        <div style="width:45%;font-weight:bold;">Flag:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.flag}}</div>
                    </div>  
                    <div style="display:flex;" *ngIf="vInfo.port">
                        <div style="width:45%;font-weight:bold;">Port:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.port}}</div>
                    </div>                                             
                    <div style="display:flex;" *ngIf="vInfo.callsign">
                        <div style="width:45%;font-weight:bold;">Call sign:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.callsign}}</div>
                    </div>                       
                    <div style="display:flex;" *ngIf="vInfo.length">
                        <div style="width:45%;font-weight:bold;">Dimensions:</div>
                        <div style="flex: 1 1 auto;">
                            {{vInfo.length}} x {{vInfo.beam}}
                        </div>
                    </div>     
                    <div style="display:flex;" *ngIf="vInfo.draft">
                        <div style="width:45%;font-weight:bold;">Draft:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.draft}}</div>
                    </div>       
                    <div style="display:flex;" *ngIf="vInfo.height">
                        <div style="width:45%;font-weight:bold;">Height:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.height}}</div>
                    </div>                                        
                    <div style="display:flex;" *ngIf="vInfo.state">
                        <div style="width:45%;font-weight:bold;">State:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.state}}</div>
                    </div>                      
                    <div style="display:flex;" *ngIf="vInfo.destination">
                        <div style="width:45%;font-weight:bold;">Destination:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.destination}}</div>
                    </div>  
                    <div style="display:flex;" *ngIf="vInfo.eta">
                        <div style="width:45%;font-weight:bold;">ETA:</div>
                        <div style="flex: 1 1 auto;">{{vInfo.eta.toLocaleString()}}</div>
                    </div>                                
                </div>
            </mat-dialog-content>
            <mat-dialog-actions>
                <div style="text-align:center;width:100%;">
                    <button mat-raised-button (click)="dialogRef.close()">
                        CLOSE
                    </button>
                </div>					
            </mat-dialog-actions>
        </div>	
    `,
    styles: [`  ._ap-ais {
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
export class AISPropertiesDialog implements OnInit {

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
        public dialogRef: MatDialogRef<AISPropertiesDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
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


/********* AtoNPropertiesDialog **********
	data: {
        title: "<string>" title text,
        target: "<SKAtoN>" adi to navigation,
        id: <string> vessel id
    }
***********************************/
@Component({
	selector: 'ap-atondialog',
	template: `
        <div class="_ap-aton">
            <div>
                <h1 mat-dialog-title>
                    <mat-icon class="ap-confirm-icon" color="primary">beenhere</mat-icon>
                    {{data.title}}
                </h1>
            </div>
            <mat-dialog-content>
                <div style="display:flex;flex-direction: column;">
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">Name:</div>
                        <div style="flex: 1 1 auto;">{{data.target.name}}</div>
                    </div>   
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">MMSI:</div>
                        <div style="flex: 1 1 auto;">{{data.target.mmsi}}</div>
                    </div>    
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">Type:</div>
                        <div style="flex: 1 1 auto;">{{data.target.type.name}}</div>
                    </div> 
                    <!--<div style="display:flex;" *ngFor="let p of data.target.properties | keyvalue">
                        <div style="width:45%;font-weight:bold;">{{p.key}}:</div>
                        <div style="flex: 1 1 auto;">{{p.value}}</div>
                    </div>-->
                    <signalk-details-list [details]=" data.target.properties"></signalk-details-list>          
                </div>
            </mat-dialog-content>
            <mat-dialog-actions>
                <div style="text-align:center;width:100%;">
                    <button mat-raised-button (click)="dialogRef.close()">
                        CLOSE
                    </button>
                </div>					
            </mat-dialog-actions>
        </div>	
    `,
    styles: [`  ._ap-aton {
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
export class AtoNPropertiesDialog implements OnInit {

    public target: any;

    constructor(
        public dialogRef: MatDialogRef<AtoNPropertiesDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }
    
    ngOnInit() { 
        this.target= this.data.target;
    } 
	
}