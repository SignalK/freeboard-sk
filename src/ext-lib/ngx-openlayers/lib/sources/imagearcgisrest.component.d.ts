import { EventEmitter, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ImageArcGISRest } from 'ol/source';
import { LayerImageComponent } from '../layers/layerimage.component';
import { SourceComponent } from './source.component';
import { ProjectionLike } from 'ol/proj';
import { AttributionLike } from 'ol/source/Source';
import { LoadFunction } from 'ol/Image';
export declare class SourceImageArcGISRestComponent extends SourceComponent implements OnInit, OnChanges {
    instance: ImageArcGISRest;
    projection: ProjectionLike | string;
    url: string;
    attributions: AttributionLike[];
    crossOrigin?: string;
    imageLoadFunction?: LoadFunction;
    params?: {
        [k: string]: any;
    };
    ratio: number;
    resolutions?: number[];
    wrapX?: boolean;
    onImageLoadStart: EventEmitter<any>;
    onImageLoadEnd: EventEmitter<any>;
    onImageLoadError: EventEmitter<any>;
    constructor(layer: LayerImageComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
