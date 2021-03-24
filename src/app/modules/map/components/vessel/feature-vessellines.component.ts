import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position } from 'src/app/lib/geoutils';

/*** True Wind Direction vector component ********/
@Component({
    selector: 'fb-twd-vector',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template:  `
        <aol-feature>
            <aol-geometry-linestring>
                <aol-collection-coordinates
                    [coordinates]="lineCoords"
                    [srid]="srid">
                </aol-collection-coordinates>
            </aol-geometry-linestring>
            <aol-style>
                <aol-style-stroke 
                    [color]="'olive'" [width]="2">
                </aol-style-stroke>
            </aol-style>
        </aol-feature>   
    `
})
export class TWDVectorComponent  {
    @Input() lineCoords: Array<Position>;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}


/*** Apparent Wind Angle vector component ********/
@Component({
    selector: 'fb-awa-vector',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template:  `
        <aol-feature>
            <aol-geometry-linestring>
                <aol-collection-coordinates
                    [coordinates]="lineCoords"
                    [srid]="srid">
                </aol-collection-coordinates>
            </aol-geometry-linestring>
            <aol-style>
                <aol-style-stroke 
                    [color]="'rgb(16, 75, 16)'" [width]="2">
                </aol-style-stroke>
            </aol-style>
        </aol-feature>   
    `
})
export class AWAVectorComponent  {
    @Input() lineCoords: Array<Position>;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}

/*** Vessel Heading vector component ********/
@Component({
    selector: 'fb-heading-line',
    changeDetection: ChangeDetectionStrategy.OnPush,
	template:  `
        <aol-feature>
            <aol-geometry-linestring>
                <aol-collection-coordinates
                    [coordinates]="lineCoords"
                    [srid]="srid">
                </aol-collection-coordinates>
            </aol-geometry-linestring>
            <aol-style>
                <aol-style-stroke 
                    [color]="'rgba(221, 99, 0, 0.5)'" [width]="4">
                </aol-style-stroke>
            </aol-style>
        </aol-feature>    
    `
})
export class HeadingLineComponent  {
    @Input() lineCoords: Array<Position>;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}