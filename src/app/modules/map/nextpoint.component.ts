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
        <div class="mat-app-background">
            <div style="display: flex; flex-wrap: nowrap;" >
                <div>
                    <button mat-stroked-button class="nav-button"
                        color="primary"
                        matTooltip="Previous point"
                        matTootipPosition="top"
                        [disabled]="index==0"
                        (click)="changeIndex(-1)">
                        <mat-icon>skip_previous</mat-icon><br>		
                    </button>
                </div>
                <div>                          
                    <button mat-stroked-button class="nav-button"
                        color="primary"
                        matTooltip="Next point"
                        matTootipPosition="top"
                        [disabled]="index>=total-1"
                        (click)="changeIndex(1)">
                        <mat-icon>skip_next</mat-icon><br>		
                    </button>                         
                </div>            
            </div>   
            <div style="font-family:roboto;height: 32px;line-height: 33px;"> 
                {{index+1}} of {{total}}
            </div>      
        </div>
	`,
    styles: [`
        .nav-button {
            height:40px;
        }
    `]
})
export class RouteNextPointComponent {
    @Input() index: number;
    @Input() total: number;
    @Output() selected: EventEmitter<number>= new EventEmitter()

    constructor() {}

    changeIndex(i: number) { this.selected.emit(i) }
}
