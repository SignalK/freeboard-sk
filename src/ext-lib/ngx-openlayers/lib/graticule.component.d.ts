import { AfterContentInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Stroke } from 'ol/style';
import { MapComponent } from './map.component';
export declare class GraticuleComponent implements AfterContentInit, OnChanges, OnDestroy {
    private map;
    instance: any;
    componentType: string;
    strokeStyle: Stroke;
    showLabels: boolean;
    lonLabelPosition: number;
    latLabelPosition: number;
    constructor(map: MapComponent);
    ngOnChanges(changes: SimpleChanges): void;
    ngAfterContentInit(): void;
    ngOnDestroy(): void;
}
