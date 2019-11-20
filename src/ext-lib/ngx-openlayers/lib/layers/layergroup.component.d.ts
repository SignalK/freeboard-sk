import { OnDestroy, OnInit } from '@angular/core';
import { Group } from 'ol/layer';
import { LayerComponent } from './layer.component';
import { MapComponent } from '../map.component';
export declare class LayerGroupComponent extends LayerComponent implements OnInit, OnDestroy {
    instance: Group;
    constructor(map: MapComponent, group?: LayerGroupComponent);
    ngOnInit(): void;
}
