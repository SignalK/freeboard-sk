import { OnDestroy, OnInit } from '@angular/core';
import { DragPan } from 'ol/interaction';
import Kinetic from 'ol/Kinetic';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
export declare class DragPanInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragPan;
    condition: Condition;
    kinetic: Kinetic;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
