import { OnDestroy, OnInit } from '@angular/core';
import { DragBox } from 'ol/interaction';
import { MapComponent } from '../map.component';
import { Condition } from 'ol/events/condition';
import { EndCondition } from 'ol/interaction/DragBox';
export declare class DragBoxInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragBox;
    className: string;
    condition: Condition;
    boxEndCondition: EndCondition;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
