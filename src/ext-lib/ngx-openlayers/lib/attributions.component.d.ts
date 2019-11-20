import { AfterViewInit, QueryList } from '@angular/core';
import { Attribution } from 'ol/control';
import { SourceComponent } from './sources/source.component';
import { AttributionComponent } from './attribution.component';
export declare class AttributionsComponent implements AfterViewInit {
    private source;
    instance: Array<Attribution>;
    attributions: QueryList<AttributionComponent>;
    constructor(source: SourceComponent);
    ngAfterViewInit(): void;
}
