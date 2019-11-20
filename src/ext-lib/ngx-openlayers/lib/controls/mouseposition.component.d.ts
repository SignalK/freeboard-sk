import { ElementRef, OnDestroy, OnInit } from '@angular/core';
import MousePosition from 'ol/control/MousePosition';
import { MapComponent } from '../map.component';
import { CoordinateFormat } from 'ol/coordinate';
import { ProjectionLike } from 'ol/proj';
export declare class ControlMousePositionComponent implements OnInit, OnDestroy {
    private map;
    private element;
    instance: MousePosition;
    coordinateFormat: CoordinateFormat;
    projection: ProjectionLike;
    target: Element;
    constructor(map: MapComponent, element: ElementRef);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
