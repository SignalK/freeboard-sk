import { OnDestroy, OnInit } from '@angular/core';
import { DragRotate } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
export declare class DragRotateInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragRotate;
    condition: Condition;
    duration: number;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
