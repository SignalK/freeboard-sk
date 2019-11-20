import { ElementRef, OnInit } from '@angular/core';
import { Attribution } from 'ol/control';
export declare class AttributionComponent implements OnInit {
    private elementRef;
    instance: Attribution;
    html: string;
    constructor(elementRef: ElementRef);
    ngOnInit(): void;
}
