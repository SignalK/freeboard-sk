import { OnDestroy, OnInit } from '@angular/core';
import { ZoomToExtent } from 'ol/control';
import { MapComponent } from '../map.component';
import { Extent } from 'ol/extent';
export declare class ControlZoomToExtentComponent implements OnInit, OnDestroy {
    private map;
    instance: ZoomToExtent;
    className: string;
    label: string | Node;
    tipLabel: string;
    extent: Extent;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
