import { OnInit } from '@angular/core';
import { SourceComponent } from './source.component';
import { LayerTileComponent } from '../layers/layertile.component';
import { UTFGrid } from 'ol/source';
export declare class SourceUTFGridComponent extends SourceComponent implements OnInit {
    instance: UTFGrid;
    tileJSON: JSON;
    url: string;
    constructor(layer: LayerTileComponent);
    ngOnInit(): void;
}
