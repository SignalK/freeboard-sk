/** popover Component **
************************/

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { SKVessel } from '../skresources/resource-classes';
import { Convert } from '../../lib/convert';

/*********** Popover ***************
title: string -  title text,
canClose: boolean - show close button
measure: boolean= measure mode;
***********************************/
@Component({
    selector: 'ap-popover',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
            <div class="popover top in" [ngClass]="{'measure': measure}">
                <div class="popover-title">
                    <div style="flex: 1 1 auto;overflow-x: auto;">{{title}}</div>
                    <div style="">
                        <button mat-icon-button *ngIf="canClose"
                            (click)="handleClose()">
                            <mat-icon>close</mat-icon>
                        </button>
                    </div>
                </div>
                <div class="popover-content">
                    <ng-content></ng-content>
                </div>
                <div class="arrow" style="left:50%;"></div>
            </div>	
			`,
    styleUrls: ['./popover.component.css']
})
export class PopoverComponent {
    @Input() title: string;
    @Input() canClose: boolean= true;
    @Input() measure: boolean= false;
    @Output() closed: EventEmitter<any>= new EventEmitter()
    constructor() {}
	
	//** lifecycle: events **
    ngOnInit() { }

    handleClose() { this.closed.emit() }
}


/*********** feature List Popover ***************
title: string -  title text,
features: Array<any> - list of features
*************************************************/
@Component({
    selector: 'feature-list-popover',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ap-popover
                [title]="title" 
                [canClose]="true"
                (closed)="handleClose()">    
            <mat-nav-list>
                <mat-list-item *ngFor="let f of features">
                    <a matLine href="#" (click)="handleSelect(f)">
                        <mat-icon [color]="(f.text.indexOf('self')!=-1) ? 'warn' : '' ">
                            {{f.icon}}
                        </mat-icon>
                        {{f.text}}
                    </a>
                </mat-list-item>
            </mat-nav-list>	
        </ap-popover>
	`,
    styleUrls: []
})
export class FeatureListPopoverComponent {
    @Input() title: string;
    @Input() features: Array<any>= [];
    @Output() closed: EventEmitter<any>= new EventEmitter();
    @Output() selected: EventEmitter<any>= new EventEmitter();

    constructor() {}
	
	handleSelect(item:any) { this.selected.emit(item) }

    handleClose() { this.closed.emit() }
}

/*********** Vessel Popover ***************
title: string -  title text,
vessel: SKVessel - vessel data
useMagnetic: string - use Magnetic values instead of True
isActive: boolean - set to true if is the active vessel
isSelf: boolean - true if vessel 'self'
*************************************************/
@Component({
    selector: 'vessel-popover',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ap-popover
            [title]="_title" 
            [canClose]="true"
            (closed)="handleClose()">
            
            <div style="display:flex;">
                <div style="font-weight:bold;">Latitude:</div>
                <div style="flex: 1 1 auto;text-align:right;">{{vessel.position[1].toFixed(6)}}</div>
            </div>
            <div style="display:flex;">
                <div style="font-weight:bold;">Longitude:</div>
                <div style="flex: 1 1 auto;text-align:right;">{{vessel.position[0].toFixed(6)}}</div>
            </div>
            <div style="display:flex;">
                <div style="font-weight:bold;">Last Update:</div>
                <div style="flex: 1 1 auto;text-align:right;">
                    {{timeLastUpdate}} {{timeAgo}}
                </div>
            </div>                                         
            <div style="display:flex;flex-wrap:no-wrap;">
                <div style="width:150px;">
                    <ap-compass 
                        [heading]="convert.radiansToDegrees(vessel.orientation)"
                        [windtrue]="(vessel.wind.direction!= null) ? convert.radiansToDegrees(vessel.wind.direction) : null"
                        [windapparent]="(vessel.wind.awa!= null) ? convert.radiansToDegrees(vessel.wind.awa) : null"
                        [speed]="(vessel.sog!= null) ? convert.msecToKnots(vessel.sog) : null">
                    </ap-compass>    
                </div>                                
                <div>    
                    &nbsp;<br>                              
                    <div>
                        <div style="border-left:olive 10px solid;padding-left: 5px;">
                            <span style="font-weight:bold"> Wind ({{useMagnetic ? 'M' : 'T'}}):</span>
                        </div>
                        <div style="flex: 1 1 auto;text-align:right;">
                            {{(vessel.wind.tws) ? 
                                convert.msecToKnots(vessel.wind.tws).toFixed(1) : '-'}}&nbsp;kn
                        </div>
                    </div>       
                    <div>
                        <div style="border-left:rgb(16, 75, 16) 10px solid;;padding-left: 5px;">
                            <span style="font-weight:bold;"> Wind (A):</span>
                        </div>
                        <div style="flex: 1 1 auto;text-align:right;">
                            {{(vessel.wind.aws) ? 
                                convert.msecToKnots(vessel.wind.aws).toFixed(1) : '-'}}&nbsp;kn
                        </div>
                    </div>                                                                                                                                                                                                                                                                                                                                       
                </div>
            </div>
            <div style="display:flex;">
                <div style="flex:1 1 auto;">
                </div>
                <div style="text-align:right;">
                    <button mat-button *ngIf="isActive"
                        (click)="handleMarkPosition()"
                        color="primary"
                        matTooltip="Add Waypoint at vessel location">
                        <mat-icon>add_location</mat-icon>
                        DROP WPT
                    </button>                                        
                    <button mat-button *ngIf="!isActive"
                        (click)="focusVessel(true)"
                        matTooltip="Focus vessel">
                        <mat-icon style="color:blue;">center_focus_weak</mat-icon>
                        FOCUS
                    </button>    
                    <button mat-button *ngIf="isActive && !isSelf"
                        (click)="focusVessel(false)"
                        matTooltip="Clear vessel focus">
                        <mat-icon style="color:blue;">clear_all</mat-icon>
                        UNFOCUS
                    </button>                                                                                
                    <button mat-button
                        (click)="handleInfo()"
                        matTooltip="Show Properties">
                        <mat-icon style="color:blue;">info_outline</mat-icon>
                        INFO
                    </button>                                                                                                             
                </div>   
            </div>                             
        </ap-popover>  
	`,
    styleUrls: []
})
export class VesselPopoverComponent {
    @Input() title: string;
    @Input() vessel: SKVessel;
    @Input() useMagnetic: string;
    @Input() isActive: boolean;
    @Input() isSelf: boolean;
    @Output() info: EventEmitter<string>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();
    @Output() focused: EventEmitter<boolean>= new EventEmitter();
    @Output() markPosition: EventEmitter<any>= new EventEmitter();
    
    _title: string;
    convert= Convert;
    timeLastUpdate: string;
    timeAgo: string;    // last update in minutes ago

    constructor() {}

    ngOnInit() { 
        if(!this.vessel) { this.handleClose() } 
        else {
            this._title= this.title || this.vessel.name || this.vessel.mmsi || this.vessel.callsign || 'Vessel:';
        }
    }

    ngOnChanges() { 
        this.timeLastUpdate= `${this.vessel.lastUpdated.getHours()}:${('00' + this.vessel.lastUpdated.getMinutes()).slice(-2)}`;
        let td= (new Date().valueOf() - this.vessel.lastUpdated.valueOf()) / 1000;
        this.timeAgo= (td<60) ? '' : `(${Math.floor(td/60)} min ago)`;
    }

    handleMarkPosition() { this.markPosition.emit(this.vessel.position) }
    
    handleInfo() { this.info.emit(this.vessel.id) }

	focusVessel(setFocus:boolean) { this.focused.emit(setFocus) }

    handleClose() { this.closed.emit() }
}

/*********** Resource Popover ***************
title: string -  title text,
resource: resource data
type: string - resource type
id: string - resource id
*************************************************/
@Component({
    selector: 'resource-popover',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ap-popover
            [title]="title" 
            [canClose]="true"
            (closed)="handleClose()">
            
            <div *ngFor="let p of properties" style="display:flex;">
                <div style="font-weight:bold;">{{p[0]}}:</div>
                <div style="flex: 1 1 auto;text-align:right;">{{p[1]}}</div>
            </div>

            <div style="display:flex;flex-wrap: wrap;">

                <div class="popover-action-button" *ngIf="ctrl.showModifyButton">
                    <button mat-button color="primary"
                        (click)="emitModify()"
                        matTooltip="Modify / Move">
                            <mat-icon>touch_app</mat-icon>
                            MOVE
                    </button> 
                </div>
                <div class="popover-action-button" *ngIf="ctrl.showAddNoteButton">
                    <button mat-button color="primary"
                        (click)="emitAddNote()"
                        matTooltip="Add Note">
                            <mat-icon>local_offer</mat-icon>
                            ADD
                    </button>                                                 
                </div>
                <div class="popover-action-button" *ngIf="ctrl.showDeleteButton">
                    <button mat-button color="warn"
                        (click)="emitDelete()"
                        matTooltip="Delete">
                            <mat-icon>delete</mat-icon>
                            DELETE
                    </button>
                </div>
                <div class="popover-action-button" *ngIf="ctrl.canActivate && !ctrl.isActive">
                    <button mat-button color="primary"
                        (click)="emitActive(true)"
                        [matTooltip]="(type=='waypoint') ? 'Navigate to Waypoint' : 'Make this the Active Route'">
                            <mat-icon>near_me</mat-icon>
                            {{ctrl.activeText}}
                    </button>                                           
                </div>
                <div class="popover-action-button" *ngIf="ctrl.isActive">                                            
                    <button mat-button  
                        (click)="emitActive(false)"
                        color="primary"
                        matTooltip="Clear Destination">
                        <mat-icon>clear_all</mat-icon>
                        CLEAR
                    </button>
                </div>
                <div class="popover-action-button" *ngIf="ctrl.showRelatedButton">
                    <button mat-button
                        (click)="emitRelated()"
                        matTooltip="Notes in Group">
                        <mat-icon>style</mat-icon>
                        GROUP
                    </button>  
                </div>                                      
                <div class="popover-action-button" *ngIf="ctrl.showInfoButton">
                    <button mat-button
                        (click)="emitInfo()"
                        matTooltip="Show Properties">
                        <mat-icon>info_outline</mat-icon>
                        INFO
                    </button>  
                </div>                                                                        
            </div>                                         
        </ap-popover>  
	`,
    styleUrls: [`./popover.component.css`]
})
export class ResourcePopoverComponent {
    @Input() title: string;
    @Input() type: string;
    @Input() resource: any;
    @Input() active: boolean;
    @Input() featureCount: number= 0;
    @Input() units: string= 'm';
    @Output() modify: EventEmitter<any>= new EventEmitter();
    @Output() delete: EventEmitter<any>= new EventEmitter();
    @Output() addNote: EventEmitter<any>= new EventEmitter();
    @Output() activated: EventEmitter<any>= new EventEmitter();
    @Output() deactivated: EventEmitter<any>= new EventEmitter();
    @Output() related: EventEmitter<any>= new EventEmitter();
    @Output() info: EventEmitter<string>= new EventEmitter();
    @Output() closed: EventEmitter<any>= new EventEmitter();
    
    properties: Array<any>  // ** resource properties
    ctrl= {
        showInfoButton: false,
        showModifyButton: false,
        showDeleteButton: false,
        showAddNoteButton: false,
        showRelatedButton: false,
        canActivate: false,
        isActive: false,
        activeText: 'ACTIVE'
    }

    constructor() {}

    ngOnChanges() { 
        this.parse();
        this.ctrl.showModifyButton= (this.featureCount > 0) ? true : false;
    }

    parse() {
        if(this.type=='waypoint') { this.parseWaypoint() }
        if(this.type=='route') { this.parseRoute() }
        if(this.type=='note') { this.parseNote() }
        if(this.type=='region') { this.parseRegion() }
    }

    parseWaypoint() {
        this.ctrl.isActive= (this.active && this.active==this.resource[0]) ? true : false;
        this.ctrl.activeText= 'GO TO';
        this.ctrl.canActivate= true;
        this.ctrl.showInfoButton= true;
        this.ctrl.showModifyButton= true; 
        this.ctrl.showDeleteButton= true;
        this.properties= [];
        if(this.resource[1].feature.properties.name) {
            this.properties.push( ['Name', this.resource[1].feature.properties.name] );
        }
        if(this.resource[1].feature.properties.cmt) {
            this.properties.push( ['Desc.', this.resource[1].feature.properties.cmt] );
        }
        this.properties.push(['Latitude', this.resource[1]['position']['latitude'].toFixed(6)]); 
        this.properties.push(['Longitude', this.resource[1]['position']['longitude'].toFixed(6)]);                 
    }

    parseRoute() {
        this.ctrl.isActive= (this.active && this.active==this.resource[0]) ? true : false;
        this.ctrl.activeText= 'ACTIVATE';
        this.ctrl.canActivate= true;
        this.ctrl.showInfoButton= true;
        this.ctrl.showModifyButton= true; 
        this.ctrl.showDeleteButton= (this.ctrl.isActive) ? false : true;
        this.properties= [];   
        this.properties.push(['Name', this.resource[1].name]);
        let d= (this.units=='m') ?
            [ (this.resource[1].distance/1000).toFixed(1), 'km' ] :
            [Convert.kmToNauticalMiles( this.resource[1].distance/1000 ).toFixed(1), 'NM'];
        this.properties.push(['Distance', `${d[0]} ${d[1]}`]);
        this.properties.push(['Desc.', this.resource[1].description]);           
    }

    parseNote() {
        this.ctrl.isActive= false;
        this.ctrl.activeText= '';
        this.ctrl.canActivate= false;
        this.ctrl.showInfoButton= true;
        this.ctrl.showModifyButton= true; 
        this.ctrl.showDeleteButton= true;
        this.ctrl.showAddNoteButton= false;
        this.ctrl.showRelatedButton= (this.resource[1].group) ? true : false;
        this.properties= [];
        this.properties.push(['Title', this.resource[1].title]);
    }

    parseRegion() {
        this.ctrl.isActive= false;
        this.ctrl.activeText= '';
        this.ctrl.canActivate= false;
        this.ctrl.showInfoButton= true;
        this.ctrl.showModifyButton= this.resource[1].feature.geometry.type=='MultiPolygon' ? false : true; 
        this.ctrl.showDeleteButton= true;
        this.ctrl.showAddNoteButton= true;
        this.properties= [];      
    }


    // *** BUTTON actions *******

    emitModify() { this.modify.emit() }

    emitAddNote() { this.addNote.emit() }

    emitDelete() { this.delete.emit() }

    emitActive(activate:boolean) { 
        if(activate) { this.activated.emit() }
        else { this.deactivated.emit() }
    }
    
    emitInfo() { this.info.emit() }

    emitRelated() { this.related.emit(this.resource[1].group) }

    handleClose() { this.closed.emit() }
}