import { OnDestroy, OnInit } from '@angular/core';
import { MouseWheelZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
export declare class MouseWheelZoomInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: MouseWheelZoom;
    duration: number;
    timeout: number;
    useAnchor: boolean;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
