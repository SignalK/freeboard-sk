/** Route NextPoint Component **
************************/

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';


/*********** NextPoint ***************
index: number - index of current point,
total: number - total number of points
***********************************/
@Component({
    selector: 'route-nextpoint',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
        <div>
            <div style="display: flex; flex-wrap: nowrap;" >
                <div>
                    <button [disabled]="index==0"
                        (click)="changeIndex(-1)">
                        <mat-icon>navigate_before</mat-icon><br>
                        <span>Prev</span>			
                    </button>
                </div>
                <div>                          
                    <button [disabled]="index>=total-1"
                        (click)="changeIndex(1)">
                        <mat-icon>navigate_next</mat-icon><br>
                        <span>Next</span>			
                    </button>                         
                </div>            
            </div>   
            <div style="background-color: rgb(221,221,221);font-family:roboto;"> 
                {{index+1}} of {{total}}
            </div>      
        </div>
	`,
    styleUrls: []
})
export class RouteNextPointComponent {
    @Input() index: number;
    @Input() total: number;
    @Output() selected: EventEmitter<number>= new EventEmitter()

    constructor() {}

    changeIndex(i: number) { this.selected.emit(i) }
}
