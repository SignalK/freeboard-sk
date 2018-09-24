/** popover Component **
************************/

import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import { MatIcon, MatButton } from '@angular/material';

/*********** Popover ***************
title: "<string>" title text,
***********************************/
@Component({
	selector: 'ap-popover',
	template: `
            <div class="popover top in">
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
    styleUrls: ['./popover.css']
})
export class PopoverComponent implements OnInit {
    @Input() title: string;
    @Input() canClose: boolean= true;
    @Output() close: EventEmitter<any>= new EventEmitter()
    constructor() {}
	
	//** lifecycle: events **
    ngOnInit() { }

    handleClose() { this.close.emit() }
}