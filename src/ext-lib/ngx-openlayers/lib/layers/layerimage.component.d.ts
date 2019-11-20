import { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Image } from 'ol/layer';
import { MapComponent } from '../map.component';
import { LayerComponent } from './layer.component';
import { LayerGroupComponent } from './layergroup.component';
import { Extent } from 'ol/extent';
export declare class LayerImageComponent extends LayerComponent implements OnInit, OnChanges {
    source: Image;
    opacity: number;
    visible: boolean;
    extent: Extent;
    minResolution: number;
    maxResolution: number;
    zIndex: number;
    constructor(map: MapComponent, group?: LayerGroupComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
