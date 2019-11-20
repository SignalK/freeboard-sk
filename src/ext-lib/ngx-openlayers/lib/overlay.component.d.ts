import { OnDestroy, OnInit } from '@angular/core';
import { MapComponent } from './map.component';
import { Overlay, PanOptions } from 'ol';
import { ContentComponent } from './content.component';
import OverlayPositioning from 'ol/OverlayPositioning';
export declare class OverlayComponent implements OnInit, OnDestroy {
    private map;
    componentType: string;
    instance: Overlay;
    element: Element;
    content: ContentComponent;
    id: number | string;
    offset: number[];
    positioning: OverlayPositioning | string;
    stopEvent: boolean;
    insertFirst: boolean;
    autoPan: boolean;
    autoPanAnimation: PanOptions;
    autoPanMargin: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
