/** Alarms Dialog Components **
********************************/

import { Component, OnInit, Inject, Input, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';


/********* AlarmsDialog *********
	data: {
        alarms: current alarms and their state
    }
***********************************/
@Component({
	selector: 'ap-alarmsdialog',
    template: `
        <div class="_ap-alarms">
            <div style="display: flex;">
                <div style="width:70px;"><mat-icon color="primary">alarm_on</mat-icon></div>
                <div mat-dialog-title style="flex: 1 1 auto;">Alarms</div>
                <div>
                    <button mat-icon-button (click)="dialogRef.close()">
                        <mat-icon>close</mat-icon>
                    </button>                               
                </div>
            </div>             
            <mat-dialog-content>
                <div style="display:flex;flex-wrap:wrap;">
                    <mat-card *ngFor="let i of alarms" style="border: silver 1px outset;">
                        <mat-card-title-group>
                            <img mat-card-avatar [src]="'./assets/img/alarms/' + i.key + '.png'"/>
                            <mat-card-title>{{i.title}}</mat-card-title>
                        </mat-card-title-group>
                        <mat-card-content> </mat-card-content>    
                        <mat-card-actions style="text-align:center;">
                            <button mat-flat-button color="warn" *ngIf="!i.cancel"
                                (click)="dialogRef.close({type: i.key, raise: true, msg: i.subtitle})">
                                <mat-icon>alarm_on</mat-icon>
                                RAISE ALARM
                            </button>   
                            <button mat-raised-button color="accent" *ngIf="i.cancel"
                                (click)="dialogRef.close({type: i.key, raise: false})">
                                <mat-icon>alarm_off</mat-icon>
                                CANCEL ALARM
                            </button>                                               
                        </mat-card-actions>
                    </mat-card>                                      
                </div>             
            </mat-dialog-content>
        </div>	
    `,
    styles: [`  ._ap-alarms {
                    font-family: arial;
                    max-width: 500px;
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
                .mat-card {
                    width: 95%;
                }

                @media only screen and (min-width : 500px) { 
                    .ap-confirm-icon {
                        min-width: 25%;
                        max-width: 25%;
                    }
                    .ap-confirm-icon .mat-icon { 
                        font-size: 40pt;
                    } 
                    .mat-card {
                        width: 40%;
                    }                   
                }                 	
			`]
})
export class AlarmsDialog implements OnInit {

    public target: any;
    public alarms= [];

    constructor(public dialogRef: MatDialogRef<AlarmsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {}
    
    ngOnInit() {
        this.alarms= [
            {
                key: 'mob',
                title: 'M.O.B.',
                subtitle: 'Man Overboard!',
                cancel: false
            },
            {
                key: 'sinking',
                title: 'Sinking',
                subtitle: 'Vessel sinking!',
                cancel: false
            },
            {
                key: 'fire',
                title: 'Fire',
                subtitle: 'Fire onboard!',
                cancel: false
            },
            {
                key: 'piracy',
                title: 'Piracy',
                subtitle: 'Pirates encountered!',
                cancel: false
            },            
            {
                key: 'collision',
                title: 'Collision',
                subtitle: 'Vessel collision!',
                cancel: false
            },
            {
                key: 'grounding',
                title: 'Grounding',
                subtitle: 'Vessel run aground!',
                cancel: false
            },
            {
                key: 'abandon',
                title: 'Abandon',
                subtitle: 'Abandoned ship!',
                cancel: false
            },
            {
                key: 'adrift',
                title: 'Adrift',
                subtitle: 'Vessel adrift!',
                cancel: false
            },
            {
                key: 'flooding',
                title: 'Flooding',
                subtitle: 'Taking on Water!',
                cancel: false
            },
            {
                key: 'listing',
                title: 'Listing',
                subtitle: 'Vessel listing!',
                cancel: false
            }                                                                                                                                                                                                                        
        ]                                                                

        this.alarms.forEach( i=> {
            if(this.data.has(i.key)) {                                              
                i.cancel= (this.data.get(i.key).state!='normal') ? true : false;
            }
        })
    }  
	
}

/********* AlarmComponent ********/
@Component({
	selector: 'ap-alarm',
    template: `
        <span class="alarmAck" *ngIf="alarm.value.acknowledged">
            <img [src]="iconUrl" [matTooltip]="alarm.title"/>
        </span>
        <mat-card *ngIf="alarm.value.visual && !alarm.value.acknowledged">
            <mat-card-title-group>
                <mat-card-title>Alarm: {{alarm.key[0].toUpperCase() + alarm.key.slice(1)}}</mat-card-title>
                <mat-card-subtitle>{{alarm.value.message}}</mat-card-subtitle>
                <img style="height:50px;" [src]="iconUrl"/>
            </mat-card-title-group>

            <mat-card-actions>
                <div style="display:flex;flex-wrap: wrap;">
                    <div>
                        <button mat-button (click)="ackAlarm(alarm.key)">
                            <mat-icon style="color:green;">check</mat-icon>
                            ACKNOWLEDGE
                        </button>                                    
                    </div>  
                    <div style="text-align: right;">
                        <button mat-button *ngIf="alarm.value.sound"
                            (click)="muteAlarm(alarm.key)"
                            [disabled]="alarm.value.muted">
                            <mat-icon color="warn">volume_off</mat-icon>
                            {{(alarm.value.muted) ? 'MUTED' : 'MUTE'}}
                        </button>                                 
                    </div>                                                               
                </div>
            </mat-card-actions>
        </mat-card>
    `,
    styles: [`    
        .alarmAck {
            text-align: center;
            flex-wrap: wrap;
        }  
        .alarmAck img {
            height: 35px;
        }                  	
	`]
})
export class AlarmComponent implements OnInit {
    @Input() alarm: any;
    @Output() acknowledge: EventEmitter<any>= new EventEmitter();
    @Output() mute: EventEmitter<any>= new EventEmitter();
    @Output() clear: EventEmitter<any>= new EventEmitter();

    private stdAlarms= ['mob','sinking','fire','piracy','flooding','collision','grounding','listing','adrift','abandon'];

    isStdAlarm:boolean= false;
    iconUrl:string;
    private imgPath:string= './assets/img/alarms/';

    constructor() {}
    
    ngOnInit() { 
        this.isStdAlarm= (this.stdAlarms.indexOf(this.alarm.key)!=-1) ? true : false;
        this.iconUrl= `${this.imgPath}${this.alarm.key}.png`;
    }  

    ackAlarm(key) { this.acknowledge.emit(key) }

    muteAlarm(key) { this.mute.emit(key) }

    clearAlarm(key) { this.clear.emit(key) }
	
}


