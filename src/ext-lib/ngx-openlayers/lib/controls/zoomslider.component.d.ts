import { OnDestroy, OnInit } from '@angular/core';
import { ZoomSlider } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlZoomSliderComponent implements OnInit, OnDestroy {
    private map;
    instance: ZoomSlider;
    className: string;
    duration: number;
    maxResolution: number;
    minResolution: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
