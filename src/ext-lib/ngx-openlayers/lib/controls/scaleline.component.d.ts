import { OnDestroy, OnInit } from '@angular/core';
import { ScaleLine } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlScaleLineComponent implements OnInit, OnDestroy {
    private map;
    instance: ScaleLine;
    units: string;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
