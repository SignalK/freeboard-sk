import { OnDestroy, OnInit } from '@angular/core';
import { DoubleClickZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
export declare class DoubleClickZoomInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DoubleClickZoom;
    duration: number;
    delta: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
