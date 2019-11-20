import { OnDestroy, OnInit } from '@angular/core';
import { Interaction } from 'ol/interaction';
import { Collection } from 'ol';
import { MapComponent } from '../map.component';
export declare class DefaultInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: Collection<Interaction>;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
