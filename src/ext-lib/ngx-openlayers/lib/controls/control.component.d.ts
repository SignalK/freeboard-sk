import { OnDestroy, OnInit } from '@angular/core';
import { Control } from 'ol/control';
import { MapComponent } from '../map.component';
import { ContentComponent } from '../content.component';
export declare class ControlComponent implements OnInit, OnDestroy {
    private map;
    componentType: string;
    instance: Control;
    element: Element;
    content: ContentComponent;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
