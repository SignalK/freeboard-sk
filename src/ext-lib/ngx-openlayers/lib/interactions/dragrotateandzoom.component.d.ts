import { OnDestroy, OnInit } from '@angular/core';
import { DragRotateAndZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
export declare class DragRotateAndZoomInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragRotateAndZoom;
    condition: Condition;
    duration: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
