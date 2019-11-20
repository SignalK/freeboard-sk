import { OnInit } from '@angular/core';
import { Vector } from 'ol/source';
import Feature from 'ol/format/Feature';
import { LayerVectorComponent } from '../layers/layervector.component';
import { SourceComponent } from './source.component';
import { LoadingStrategy } from 'ol/source/Vector';
export declare class SourceVectorComponent extends SourceComponent implements OnInit {
    instance: Vector;
    overlaps: boolean;
    useSpatialIndex: boolean;
    wrapX: boolean;
    url: string;
    format: Feature;
    strategy: LoadingStrategy;
    constructor(layer: LayerVectorComponent);
    ngOnInit(): void;
}
