import { ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Attribution } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlAttributionComponent implements OnInit, OnDestroy {
    private map;
    private element;
    componentType: string;
    instance: Attribution;
    target: Element;
    collapsible: boolean;
    constructor(map: MapComponent, element: ElementRef);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
