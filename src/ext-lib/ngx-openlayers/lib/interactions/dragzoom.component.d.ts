import { OnDestroy, OnInit } from '@angular/core';
import { DragZoom } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
export declare class DragZoomInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragZoom;
    className: string;
    condition: Condition;
    duration: number;
    out: boolean;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
