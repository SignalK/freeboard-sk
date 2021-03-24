import {Component, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

/*** Note & Region resources component ********/
@Component({
    selector: 'fb-notes-regions',
    changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: `./layer-notes.component.html`
})
export class NotesComponent  {
    @Input() regions: Array<any>;
    @Input() notes: Array<any>;
    @Input() zIndex: number;
    @Input() srid: string;

    constructor() { }

	ngOnInit() { }
	
	//** handle inputs changes
	ngOnChanges(changes: SimpleChanges) { }	
		
}