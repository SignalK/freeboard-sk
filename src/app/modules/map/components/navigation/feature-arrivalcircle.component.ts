import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position, GeoUtils } from 'src/app/lib/geoutils';

/*** Arrival Circle component ********/
@Component({
    selector: 'fb-arrival-circle',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
        <aol-feature>
            <aol-geometry-circle [radius]="mapifiedRadius">  
                <aol-coordinate 
                    [x]="position[0]" 
                    [y]="position[1]" 
                    [srid]="srid">
                </aol-coordinate>                               
                <aol-style>
                    <aol-style-fill [color]="'rgba(255, 255, 255, .1)'"></aol-style-fill>
                    <aol-style-stroke 
                        [color]="'rgba(242, 153, 10, 1)'"
                        [width]="2"
                        [lineDash]="[5,5]">
                    </aol-style-stroke>                                          
                </aol-style>
            </aol-geometry-circle>
        </aol-feature>
    `
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
