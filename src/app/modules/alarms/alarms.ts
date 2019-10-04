/** Alarms Dialog Components **
********************************/

import { Component, OnInit, Inject, Input, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SKStreamProvider } from '../skstream/skstream.service'
import { AlarmsFacade } from './alarms.facade';
import { Observable } from 'rxjs';


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
                    <div class="alarm-item" *ngFor="let i of stdAlarms">
                        <mat-card *ngIf="i.cancel || i.displayAlways"
                                style="border: silver 1px outset;">
                            <mat-card-title-group>
                                <img mat-card-avatar [src]="'./assets/img/alarms/' + i.key + '.png'"/>
                                <mat-card-title>{{i.title}}</mat-card-title>
                            </mat-card-title-group>
                            <mat-card-content> </mat-card-content>  
                            <mat-card-actions style="text-align:center;">
                                <button mat-flat-button color="warn" *ngIf="!i.cancel"
                                    (click)="raise(i.key, i.subtitle)">
                                    <mat-icon>alarm_on</mat-icon>
                                    RAISE ALARM
                                </button>   
                                <button mat-raised-button color="accent" *ngIf="i.cancel"
                                    (click)="clear(i.key)">
                                    <mat-icon>alarm_off</mat-icon>
                                    CANCEL ALARM
                                </button>                                               
                            </mat-card-actions>
                        </mat-card>  
                    </div>                                  
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
                    border: blue 1px solid;
                }
                .alarm-item {
                    width: 100%;                    
                }

                @media only screen and (min-width : 500px) { 
                    .ap-confirm-icon {
                        min-width: 25%;
                        max-width: 25%;
                    }
                    .ap-confirm-icon .mat-icon { 
                        font-size: 40pt;
                    } 
                    .alarm-item {
                        width: 50%;
                    }                   
                }                 	
			`]
})
export class AlarmsDialog implements OnInit {

    public target: any;
    public stdAlarms: Array<any>;
    private obs;

    constructor(
        private stream: SKStreamProvider,
        private facade: AlarmsFacade,
        public dialogRef: MatDialogRef<AlarmsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }
    
    ngOnInit() {
        this.obs= this.facade.update$().subscribe(
            r=> { this.parseAlarms() }
        )
        this.stdAlarms= [
            {
                key: 'mob',
                title: 'M.O.B.',
                subtitle: 'Man Overboard!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'sinking',
                title: 'Sinking',
                subtitle: 'Vessel sinking!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'fire',
                title: 'Fire',
                subtitle: 'Fire onboard!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'piracy',
                title: 'Piracy',
                subtitle: 'Pirates encountered!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'abandon',
                title: 'Abandon',
                subtitle: 'Abandoned ship!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'adrift',
                title: 'Adrift',
                subtitle: 'Vessel adrift!',
                cancel: false,
                displayAlways: true
            },
            {
                key: 'flooding',
                title: 'Flooding',
                subtitle: 'Taking on Water!',
                cancel: false,
                displayAlways: false
            },
            {
                key: 'listing',
                title: 'Listing',
                subtitle: 'Vessel listing!',
                cancel: false,
                displayAlways: false
            },            
            {
                key: 'collision',
                title: 'Collision',
                subtitle: 'Vessel collision!',
                cancel: false,
                displayAlways: false
            },
            {
                key: 'grounding',
                title: 'Grounding',
                subtitle: 'Vessel run aground!',
                cancel: false,
                displayAlways: false
            }                                                                                                                                                                                                                       
        ];                                                                

        this.parseAlarms();
    } 
    
    ngOnDestroy() { this.obs.unsubscribe() }

    parseAlarms() {
        this.stdAlarms.forEach( i=> {
            if(this.facade.alarms.has(i.key)) {                                              
                i.cancel= (this.facade.alarms.get(i.key).state!='normal') ? true : false;
            }
            else { i.cancel=false }
        });
        this.stdAlarms.sort( (a,b)=> { 
            if(!a.cancel && b.cancel) { return 1 }
            if(a.cancel && !b.cancel) { return -1 }
            else { return 0 }
        });
    }
    
    raise(alarmType: string, msg:string) {
        this.stream.postMessage({ 
            cmd: 'alarm',
            options: { 
                raise: true,
                type: alarmType,
                message: msg,
                state: 'alarm'
            }
        });  
        this.dialogRef.close();         
    }

    clear(alarmType: string) {
        this.stream.postMessage({ 
            cmd: 'alarm',
            options: { 
                raise: false,
                type: alarmType,
                message: '',
                state: ''
            }
        });           
    }    
}

/********* AlarmComponent ********/
@Component({
	selector: 'ap-alarm',
    template: `
        <span class="alarmAck" *ngIf="alarm.value.acknowledged"
                (click)="minClick(alarm.key)">
            <img [src]="iconUrl" [matTooltip]="alarm.title"/>
        </span>
        <mat-card *ngIf="alarm.value.visual && !alarm.value.acknowledged">
            <div style="display:flex; flex-wrap:nowrap;">
                <div style="flex:1 1 auto;padding-right:5px;">{{alarm.value.message}}</div>
                <div><img style="height:50px;" [src]="iconUrl" /></div>
            </div>
            
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
    @Output() acknowledge: EventEmitter<string>= new EventEmitter();
    @Output() unacknowledge: EventEmitter<string>= new EventEmitter();
    @Output() mute: EventEmitter<string>= new EventEmitter();
    @Output() clear: EventEmitter<string>= new EventEmitter();
    @Output() open: EventEmitter<string>= new EventEmitter();

    private stdAlarms= ['mob','sinking','fire','piracy','flooding','collision','grounding','listing','adrift','abandon'];

    canUnAck:boolean= false;
    isStdAlarm:boolean= false;
    iconUrl:string;
    private imgPath:string= './assets/img/alarms/';

    constructor() {}
    
    ngOnInit() { 
        this.canUnAck= (this.stdAlarms.indexOf(this.alarm.key)==-1) ? true : false;
        this.isStdAlarm= (this.stdAlarms.indexOf(this.alarm.key)!=-1) ? true : false;
        this.iconUrl= `${this.imgPath}${this.alarm.key}.png`;
    }  

    ackAlarm(key:string) { this.acknowledge.emit(key) }

    muteAlarm(key:string) { this.mute.emit(key) }

    clearAlarm(key:string) { this.clear.emit(key) }

    minClick(key:string) { 
        if(this.canUnAck) {this.unacknowledge.emit(key) }
        else { this.open.emit(key) }
    }
	
}


