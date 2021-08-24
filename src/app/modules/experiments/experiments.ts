/** Experiments Components **
********************************/

import { Component, OnInit, Output, EventEmitter } from '@angular/core';
//import { AppInfo } from 'src/app/app.info';

/********* ExperimentsComponent ********/
@Component({
	selector: 'fb-experiments',
    template: `
        <mat-menu #experimentsmenu="matMenu">
            <!--<a mat-menu-item (click)="handleSelect('exp_id_here')">
                <mat-icon>filter_drama</mat-icon>
                <span>EXP_NAME_HERE</span>			
            </a>-->
            <a mat-menu-item>
                <span>None Available</span>	
            </a>
        </mat-menu>

        <div>
            <button mat-mini-fab [color]="''"
                [matMenuTriggerFor]="experimentsmenu"
                matTooltip="Experiments"
                matTooltipPosition="left">
                <mat-icon>science</mat-icon>
            </button>                        
        </div>  
    `,
    styles: [`    
    `]
})
export class ExperimentsComponent implements OnInit {
    @Output() selected: EventEmitter<any>= new EventEmitter();

    constructor() {}
    
    ngOnInit() {}

    handleSelect(choice:string, value?:any) { this.selected.emit({choice: choice, value: value}) }
	
}


