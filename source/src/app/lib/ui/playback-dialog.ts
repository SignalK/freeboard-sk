/** History Playback Dialog **
********************************/

import {Component, OnInit, Input, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
	selector: 'ap-playbackdialog',
	template: `
        <div class="_ap-playback">
            <div>
                <h1 mat-dialog-title>History Playback</h1>
            </div>
            <mat-dialog-content>
                <div style="display:flex;">
                    <div>       
                        <div>
                            <b>Context:</b>&nbsp;&nbsp;
                            <mat-form-field  style="width:50px;">
                                <mat-select #inpcontext [value]="'self'"
                                    (selectionChange)="formValue($event,inpcontext)">
                                    <mat-option *ngFor="let i of ['self','all']" [value]="i">{{i}}</mat-option>
                                </mat-select>
                            </mat-form-field>                                               
                        </div>                                        
                        <div>                                     
                            <mat-form-field>
                                <input matInput #inpdate required [matDatepicker]="picker" 
                                    (dateInput)="formValue($event,$event)"
                                    (dateChange)="formValue($event,$event)"
                                    placeholder="Choose a start date">
                                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                                <mat-datepicker #picker (dateChange)="formValue($event,inpdate)"></mat-datepicker>
                            </mat-form-field>
                        </div>
                        <div>
                            <b>Start Time:</b>&nbsp;&nbsp;
                            <mat-form-field style="width:50px;">
                                <mat-select #inphr [value]="'00'"
                                    (selectionChange)="formValue($event,inphr)">
                                    <mat-option *ngFor="let i of hrValues()" [value]="i">{{i}}</mat-option>
                                </mat-select>
                            </mat-form-field>     
                            <b>: </b>
                            <mat-form-field style="width:50px;">
                                <mat-select #inpmin [value]="'00'"
                                (selectionChange)="formValue($event,inpmin)">
                                    <mat-option *ngFor="let i of minValues()" [value]="i">{{i}}</mat-option>
                                </mat-select>
                            </mat-form-field>                                                
                        </div>  
                        <div>
                        <b>Playback Rate:</b>&nbsp;&nbsp;
                        <mat-form-field style="width:50px;"
                            matTooltip="Advance stream the selected number of seconds for every second of playback">
                            <mat-select #inprate [value]="1" 
                                (selectionChange)="formValue($event,inprate)">
                                <mat-option *ngFor="let i of rateValues()" [value]="i">{{i}}</mat-option>
                            </mat-select>
                        </mat-form-field>                         
                        </div>                             
                    </div>                            
                </div>
            </mat-dialog-content>
            <mat-dialog-actions>
                <div style="text-align:center;width:100%;">
                    <button mat-raised-button color="primary" 
                        [disabled]="formReady"
                        (click)="dialogRef.close({result:true, data: formData})">
                        SAVE
                    </button>
                    <button mat-raised-button (click)="dialogRef.close({result:false, data: formData})">
                        CANCEL
                    </button>
                </div>					
            </mat-dialog-actions>
        </div>	
    `,
    styles: [`  ._ap-playback {
                    font-family: arial;
                    min-width: 300px;
                }
                @media only screen
                and (min-device-width : 768px)
                and (max-device-width : 1024px),
                only screen	and (min-width : 800px) { 
                   
                }                 	
			`]
})
export class PlaybackDialog implements OnInit {
    public hour;
    public minute;
    public formData= {
        context: 'self',
        startTimeHr: '00',
        startTimeMin: '00',
        startDate: null,
        playBackRate: 1
    };
    public formReady: boolean= true;

    constructor(
        public dialogRef: MatDialogRef<PlaybackDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
	}
	
	//** lifecycle: events **
    ngOnInit() {} 

    formValue(e, f) {
        console.log(f);
    }

    hrValues() { 
        let v= [];
        for(let i=0;i<24;i++) { v.push( ('00' + i).slice(-2) ) }
        return v;
    }
    
    minValues() { 
        let v= [];
        for(let i=0;i<59;i++) { v.push( ('00' + i).slice(-2) ) }
        return v;
    }    

    rateValues() { return  [1,5,10,20,30,45,60] }     

}


