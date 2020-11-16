import { EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { ImageStatic } from 'ol/source';
import { SourceComponent } from './source.component';
import { LayerImageComponent } from '../layers/layerimage.component';
import { ProjectionLike } from 'ol/proj';
import { Extent } from 'ol/extent';
import { AttributionLike } from 'ol/source/Source';
import { LoadFunction } from 'ol/Image';
import { Size } from 'ol/size';
export declare class SourceImageStaticComponent extends SourceComponent implements OnInit, OnChanges {
    instance: ImageStatic;
    projection: ProjectionLike | string;
    imageExtent: Extent;
    url: string;
    attributions: AttributionLike;
    crossOrigin?: string;
    imageLoadFunction?: LoadFunction;
    imageSize?: Size;
    onImageLoadStart: EventEmitter<any>;
    onImageLoadEnd: EventEmitter<any>;
    onImageLoadError: EventEmitter<any>;
    constructor(layer: LayerImageComponent);
    setLayerSource(): void;
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
