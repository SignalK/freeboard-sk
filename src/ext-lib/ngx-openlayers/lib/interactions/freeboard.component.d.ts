import { OnDestroy, OnInit } from '@angular/core';
import { Interaction } from 'ol/interaction';
import { MapComponent } from '../map.component';
export declare class FreeboardInteractionComponent implements OnInit, OnDestroy {
    private map;
    interactions: Array<Interaction>;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
