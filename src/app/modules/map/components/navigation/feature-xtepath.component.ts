import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position } from 'src/app/lib/geoutils';

/*** Cross Track Error component ********/
@Component({
    selector: 'fb-xte-path',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl:  './feature-xtepath.component.html'
})
export class XTEPathComponent  {
    @Input() color: string= 'gray';
    @Input() lineCoords: Array<Position>;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { 
        this.color= this.color ? this.color : 'gray';
    }	
		
}
