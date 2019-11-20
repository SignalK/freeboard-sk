import { OnDestroy, OnInit } from '@angular/core';
import { Zoom } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlZoomComponent implements OnInit, OnDestroy {
    private map;
    instance: Zoom;
    duration: number;
    zoomInLabel: string | Node;
    zoomOutLabel: string | Node;
    zoomInTipLabel: string;
    zoomOutTipLabel: string;
    delta: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
