import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { SKResourceSet } from 'src/app/modules/skresources/sets/resource-set';
import { AppInfo } from 'src/app/app.info';

@Component({
    selector: 'fb-resource-set',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: `./layer-resourceset.component.html`
})
export class ResourceSetComponent implements OnInit, OnDestroy, OnChanges {

    @Input() items: Array<SKResourceSet>;
    @Input() selected: Array<string>= [];
    @Input() zIndex: number;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(public app:AppInfo) { }

    ngOnInit() { }

    ngOnDestroy() { }

    ngOnChanges(changes:SimpleChanges) { 
        console.log('..')
    }
}
