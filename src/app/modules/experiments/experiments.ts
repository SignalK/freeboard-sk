/** Experiments Components **
********************************/

import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AppInfo } from 'src/app/app.info';

/********* ExperimentsComponent ********/
@Component({
	selector: 'fb-experiments',
    template: `
        <mat-menu #experimentsmenu="matMenu">
            <a mat-menu-item (click)="handleSelect('grib')">
                <mat-icon>filter_drama</mat-icon>
                <span>GRIB Data</span>			
            </a>
        </mat-menu>

        <div class="expButton" *ngIf="app.config.experiments">
            <button mat-icon-button
                [matMenuTriggerFor]="experimentsmenu"
                matTooltip="Experiments"
                matTooltipPosition="left">
                <mat-icon>science</mat-icon>
            </button>                        
        </div>  
    `,
    styles: [`
        .expButton { 
            border-radius:5px;
            width:40px; height:40px;
            background-color:rgb(200,200,200);
            box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 
                        0px 6px 10px 0px rgba(0, 0, 0, 0.14), 
                        0px 1px 18px 0px rgba(0, 0, 0, 0.12);
        }    
    `]
})
export class ExperimentsComponent implements OnInit {
    @Output() selected: EventEmitter<any>= new EventEmitter();

    constructor(public app: AppInfo) {}
    
    ngOnInit() {}

    handleSelect(choice:string, value?:any) { this.selected.emit({choice: choice, value: value}) }
	
}


