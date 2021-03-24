import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

/*** Track resources component ********/
@Component({
    selector: 'fb-tracks',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: `./layer-tracks.component.html`
})
export class TracksComponent  {
    @Input() tracks: Array<any>;
    @Input() mapZoom: number;
    @Input() labelMinZoom: number= 10;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	

    showLabel() { return (this.mapZoom < this.labelMinZoom) ? false : true }
		
}