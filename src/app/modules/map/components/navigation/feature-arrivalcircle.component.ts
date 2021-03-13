import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position, GeoUtils } from 'src/app/lib/geoutils';

/*** Arrival Circle component ********/
@Component({
    selector: 'fb-arrival-circle',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl:  './feature-arrivalcircle.component.html'
})
export class ArrivalCircleComponent  {
    @Input() radius: number;
    @Input() position: Position;
    @Input() srid: string;

    public mapifiedRadius: number= 0;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { 
        this.mapifiedRadius= GeoUtils.mapifyRadius(this.radius, this.position);
    }	
		
}
