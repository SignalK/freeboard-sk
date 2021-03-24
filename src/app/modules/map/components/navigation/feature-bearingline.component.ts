import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position } from 'src/app/lib/geoutils';

/*** Cross Track Error component ********/
@Component({
    selector: 'fb-bearing-line',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl:  './feature-bearingline.component.html'
})
export class BearingLineComponent  {
    @Input() lineCoords: Array<Position>;
    @Input() marker: Position;
    @Input() markerName: string;
    @Input() showMarker: boolean= false;
    @Input() mapZoom: number;
    @Input() labelMinZoom: number= 10;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { 
        if(changes.markerName && !changes.markerName.currentValue) { 
            this.markerName= ' ';
        }
    }

    showLabel() { return (this.mapZoom < this.labelMinZoom) ? false : true }
}
