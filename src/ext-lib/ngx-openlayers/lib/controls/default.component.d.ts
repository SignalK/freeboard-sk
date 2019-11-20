import { OnDestroy, OnInit } from '@angular/core';
import { Control } from 'ol/control';
import { Collection } from 'ol';
import { Options as AttributionOptions } from 'ol/control/Attribution';
import { Options as RotateOptions } from 'ol/control/Rotate';
import { Options as ZoomOptions } from 'ol/control/Zoom';
import { MapComponent } from '../map.component';
export declare class DefaultControlComponent implements OnInit, OnDestroy {
    private map;
    instance: Collection<Control>;
    attribution: boolean;
    attributionOptions: AttributionOptions;
    rotate: boolean;
    rotateOptions: RotateOptions;
    zoom: boolean;
    zoomOptions: ZoomOptions;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
