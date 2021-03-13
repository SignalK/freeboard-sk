import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { Position, GeoUtils } from 'src/app/lib/geoutils';

/*** AnchorAlarm component ********/
@Component({
    selector: 'fb-anchor-alarm',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl:  './layer-anchor.component.html'
})
export class AnchorAlarmComponent  {
    @Input() radius: number;
    @Input() anchorPosition: Position;
	@Input() lineCoords: Array<Position>;
    @Input() zIndex: number;
    @Input() srid: string;

    public mapifiedRadius: number= 0;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { 
        this.mapifiedRadius= GeoUtils.mapifyRadius(this.radius, this.anchorPosition);
    }	
		
}
