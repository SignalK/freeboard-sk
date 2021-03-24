import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

/*** Waypoint resources component ********/
@Component({
    selector: 'fb-waypoints',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: `./layer-waypoints.component.html`
})
export class WaypointsComponent  {
    @Input() waypoints: Array<any>;
    @Input() activeWaypoint: string;
    @Input() labelMinZoom: number= 10;
    @Input() mapZoom: number;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	

    showLabel() { return (this.mapZoom < this.labelMinZoom) ? false : true }
		
}