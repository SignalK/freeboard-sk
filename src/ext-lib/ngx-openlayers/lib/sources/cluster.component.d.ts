import { AfterContentInit, SimpleChanges, OnChanges } from '@angular/core';
import { Feature } from 'ol';
import { LayerVectorComponent } from '../layers/layervector.component';
import { SourceComponent } from './source.component';
import { SourceVectorComponent } from './vector.component';
import { Cluster, Vector } from 'ol/source';
import { Point } from 'ol/geom';
export declare class SourceClusterComponent extends SourceComponent implements AfterContentInit, OnChanges {
    instance: Cluster;
    distance: number;
    geometryFunction?: (feature: Feature) => Point;
    wrapX?: boolean;
    sourceVectorComponent: SourceVectorComponent;
    source: Vector;
    constructor(layer: LayerVectorComponent);
    ngAfterContentInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
