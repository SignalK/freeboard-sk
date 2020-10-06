import { OnDestroy, OnInit } from '@angular/core';
import { DragAndDrop } from 'ol/interaction';
import Feature from 'ol/format/Feature';
import { MapComponent } from '../map.component';
import { ProjectionLike } from 'ol/proj';
export declare class DragAndDropInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: DragAndDrop;
    formatConstructors: ((n: Feature) => any)[];
    projection: ProjectionLike;
    target: Element;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
