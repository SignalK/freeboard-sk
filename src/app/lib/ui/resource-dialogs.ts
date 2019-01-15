/** Resource Dialog Components **
********************************/

import {Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { Convert } from '../../lib/convert'

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
                                    <div style="width:45px;font-weight:bold;">Lng:</div>
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
	public icon;

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

        this.icon= this.data.type=='route' ? 'directions' : 
            this.data.addMode ? 'add_location' : 'edit_location';
    } 

}

/********* AISPropertiesDialog **********
	data: {
        title: "<string>" title text,
        name: "<string>"resource name,
        comment: "<string>"resource comment,
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
                        <div style="flex: 1 1 auto;">{{target.name}}</div>
                    </div>   
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">MMSI:</div>
                        <div style="flex: 1 1 auto;">{{target.mmsi}}</div>
                    </div>                              
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">Call sign:</div>
                        <div style="flex: 1 1 auto;">{{target.callsign}}</div>
                    </div>    
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">State:</div>
                        <div style="flex: 1 1 auto;">{{target.state}}</div>
                    </div>                     
                    <div style="display:flex;" *ngIf="target.position">
                        <div style="width:45%;font-weight:bold;">Latitude:</div>
                        <div style="flex: 1 1 auto;">{{target.position[1].toFixed(6)}}</div>
                    </div>       
                    <div style="display:flex;" *ngIf="target.position">
                        <div style="width:45%;font-weight:bold;">Longitude:</div>
                        <div style="flex: 1 1 auto;">{{target.position[0].toFixed(6)}}</div>
                    </div>  
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">COG:</div>
                        <div style="flex: 1 1 auto;">{{formatDegrees(target.cogTrue)}}</div>
                    </div>     
                    <div style="display:flex;">
                        <div style="width:45%;font-weight:bold;">SOG:</div>
                        <div style="flex: 1 1 auto;">{{formatKnots(target.sog)}}</div>
                    </div>      
                    <div style="display:flex;" *ngIf="target.wind.tws">
                        <div style="width:45%;font-weight:bold;">Wind (T):</div>
                        <div style="flex: 1 1 auto;">{{formatKnots(target.wind.tws)}} m/s ({{formatDegrees(target.wind.twd)}})</div>
                    </div>       
                    <div style="display:flex;" *ngIf="target.wind.aws">
                        <div style="width:45%;font-weight:bold;">Wind (A):</div>
                        <div style="flex: 1 1 auto;">{{formatKnots(target.wind.aws)}} m/s ({{formatDegrees(target.wind.awa)}})</div>
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

    constructor(
        public dialogRef: MatDialogRef<ResourceDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }
    
    ngOnInit() {
        this.target= this.data.target;
    }

    formatDegrees(val: number) { 
        return (val ? `${Convert.radiansToDegrees(val).toFixed(1)} ${String.fromCharCode(186)}` : '0.0');
    }

    formatKnots(val: number) { 
        return (val ? `${Convert.msecToKnots(val).toFixed(1)} kn` : '0.0');
    }    
	
}


