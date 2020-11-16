import { OnDestroy } from '@angular/core';
import { Source } from 'ol';
import { LayerComponent } from '../layers/layer.component';
import { SourceRasterComponent } from './raster.component';
export declare class SourceComponent implements OnDestroy {
    protected host: LayerComponent;
    protected raster?: SourceRasterComponent;
    instance: Source;
    componentType: string;
    attributions: any;
    constructor(host: LayerComponent, raster?: SourceRasterComponent);
    ngOnDestroy(): void;
    protected _register(s: Source): void;
}
