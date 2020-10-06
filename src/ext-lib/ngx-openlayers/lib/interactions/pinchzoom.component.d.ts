import { OnDestroy, OnInit } from '@angular/core';
import { PinchZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
export declare class PinchZoomInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: PinchZoom;
    duration: number;
    constrainResolution: boolean;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
