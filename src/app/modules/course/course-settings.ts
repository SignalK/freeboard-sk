import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { AppInfo } from 'src/app/app.info'
import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';

/********* Course Settings Modal ********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
	selector: 'ap-course-modal',
	template: `
        <div class="_ap-course">
            <mat-toolbar>
                <span>
                    <mat-icon>settings</mat-icon>
                </span>
                <span style="flex: 1 1 auto; padding-left:20px;text-align:center;">
                    {{data.title}}
                </span>
                <span>
                    <button mat-icon-button (click)="closeModal()"
                        matTooltip="Close" matTooltipPosition="below">
                        <mat-icon>keyboard_arrow_down</mat-icon>
                    </button>
                </span>
            </mat-toolbar>          

            <mat-card>
                <div style="display:flex;flex-wrap:no-wrap;">
                    <div class="key-label">
                        Arrival Circle
                    </div>
                    <div style="flex:1 1 auto;">
                    <mat-form-field style="width:100%;" floatLabel="always">
                        <mat-label>Arrival Circle radius
                            ({{(app.config.units.distance=='m') ? app.config.units.distance : 'NM'}}):
                        </mat-label>
                        <input matInput type="number" #arrivalCircle id="arrivalCircle"
                            min="0"
                            [value]="frmArrivalCircle"
                            (change)="onFormChange($event, arrivalCircle)"
                            placeholder="500"
                            matTooltip="Enter Arrival circle radius"/>                                                                      
                    </mat-form-field>
                    </div>
                    <div style="width:45px;">

                    </div>                    
                </div>
            </mat-card>

            <mat-card *ngIf="app.config.experiments">
                <mat-card-title>
                    <span style="font-size: 14pt;">Auto-Pilot</span>
                </mat-card-title>
                <div style="display:flex;flex-wrap:no-wrap;">
                    <div class="key-label">
                        Mode:
                    </div>
                    <div style="flex:1 1 auto;">
                    <mat-form-field style="width:100%;" floatLabel="always">
                        <mat-label>Auto-Pilot Mode</mat-label>                    
                        <mat-select #apMode
                                [(value)]="ap.mode" 
                                (selectionChange)="onFormChange($event, apMode)"
                                placeholder="Autopilot Mode">
                            <mat-option *ngFor="let i of apModeList" 
                                    [value]="i.value"
                                    [matTooltip]="i.description"
                                    matTooltipPosition="right">
                                {{i.description}}
                            </mat-option>
                        </mat-select>                                                                        
                    </mat-form-field>
                    </div>
                    <div style="width:45px;">

                    </div>                    
                </div>
            </mat-card>            
        </div>	
    `,
    styles: [`  ._ap-course {
                    font-family: arial;
                    min-width: 300px;
                }
                ._ap-course .key-label {
                    font-weight: 500;
                    width: 120px;
                }  
                ._ap-course .key-desc {
                    font-style: italic;
                }                                	
			`]
})
export class CourseSettingsModal implements OnInit {

    frmArrivalCircle:number;
    ap= {
        mode: 'heading',
        state: null
    }

    apModeList= [
        {value: 'heading', description: 'Compass'},
        {value: 'course', description: 'GPS / COG'},
        {value: 'windApparent', description: 'Wind (Apparent)'},
        {value: 'windTrue', description: 'Wind (True)'}
    ]

    constructor(
        public app: AppInfo,
        private cdr: ChangeDetectorRef,
        private sk: SignalKClient,        
        public modalRef: MatBottomSheetRef<CourseSettingsModal>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
    }
    
    ngOnInit() { 
        if(this.data.title==='undefined') { this.data['title']= 'Course Settings' }
        this.frmArrivalCircle= (this.app.data.navData.arrivalCircle==null) ? 0 : this.app.data.navData.arrivalCircle;
        this.frmArrivalCircle= (this.app.config.units.distance=='m') ?
            this.frmArrivalCircle : 
            Number(Convert.kmToNauticalMiles( this.frmArrivalCircle / 1000).toFixed(1));
    } 

    closeModal() { this.modalRef.dismiss() }    

    onFormChange(e:any, f:any) {
        if(false) { //f && !f.invalid) { 
            // f.value
        } 
        else { 
            if(e.target.id=='arrivalCircle') {
                if(e.target.value!== '' && e.target.value!== null) {
                    let d= (this.app.config.units.distance=='m') ?
                        Number(e.target.value) : 
                        Convert.nauticalMilesToKm(  Number(e.target.value) )*1000;
                    d= (d<=0) ? null : d;
                    let context= (this.app.data.vessels.activeId) ? this.app.data.vessels.activeId : 'self';
                    this.sk.api.put(context, 'navigation.courseGreatCircle.nextPoint.arrivalCircle', d)
                    .subscribe( 
                        ()=> {},
                        (err:any)=> { console.warn(err) }
                    );
                }
            }
        }
    }

}


