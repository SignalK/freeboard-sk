import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position } from 'src/app/lib/geoutils';

/*** Vessel component ********/
@Component({
    selector: 'fb-vessel',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template:  `
        <aol-feature [id]="id">
            <aol-geometry-point>
                <aol-coordinate 
                    [x]="position[0]" 
                    [y]="position[1]" 
                    [srid]="srid">
                </aol-coordinate>
            </aol-geometry-point>
            <aol-style>
                <aol-style-icon 
                    [anchor]="[9.5,22.5]"
                    [anchorXUnits]="'pixels'"
                    [anchorYUnits]= "'pixels'"
                    [src]="activeId ? './assets/img/ship_blur.png' : './assets/img/ship_red.png'"
                    [size]="[50,50]"
                    [scale]=".75"
                    [rotateWithView]="true"
                    [rotation]="heading">
                </aol-style-icon>                                   
            </aol-style>
        </aol-feature>  
    `
})
export class VesselComponent  {
    @Input() id: string;
    @Input() activeId: string;
    @Input() position: Array<Position>;
    @Input() heading: number= 0;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}

/*** Vessel Trail component ********/
@Component({
    selector: 'fb-vessel-trail',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template:  `
        <aol-layer-vector [zIndex]="zIndex" [renderBuffer]="200">
            <aol-source-vector>
                <aol-feature>
                    <aol-geometry-linestring>
                        <aol-collection-coordinates
                            [coordinates]="localTrail"
                            [srid]="srid">
                        </aol-collection-coordinates>
                    </aol-geometry-linestring>
                    <aol-style>
                        <aol-style-stroke 
                            [color]="'rgb(252, 3, 132)'" 
                            [lineDash]="[2,2]"
                            [width]="1">
                        </aol-style-stroke>
                    </aol-style>
                </aol-feature>
                <!-- trail from server -->
                <aol-feature> 
                    <aol-geometry-multilinestring>
                        <aol-collection-coordinates
                            [coordinates]="serverTrail"
                            [srid]="srid">
                        </aol-collection-coordinates>                      
                    </aol-geometry-multilinestring>
                    <aol-style>
                        <aol-style-stroke 
                            [color]="'rgb(252, 3, 132)'" 
                            [lineDash]="[4,4]"
                            [width]="1">
                        </aol-style-stroke>                        
                    </aol-style>
                </aol-feature>               
            </aol-source-vector>
    </aol-layer-vector>
    `
})
export class VesselTrailComponent  {
    @Input() localTrail: Array<Position>;
    @Input() serverTrail: Array<Position>;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}