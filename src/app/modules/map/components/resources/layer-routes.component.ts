import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

/*** Route resources component ********/
@Component({
    selector: 'fb-routes',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: `./layer-routes.component.html`
})
export class RoutesComponent  {
    @Input() routes: Array<any>;
    @Input() activeRoute: string;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}