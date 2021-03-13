import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position } from 'src/app/lib/geoutils';

/*** TCPA Alarm component ********/
@Component({
    selector: 'fb-tcpa-alarm',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl:  './layer-tcpa.component.html'
})
export class TCPAAlarmComponent  {
    @Input() targetPosition: Position;
	@Input() lineCoords: Array<Position>;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}
