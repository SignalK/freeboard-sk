import { OnInit } from '@angular/core';
import { TileJSON } from 'ol/source';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
export declare class SourceTileJSONComponent extends SourceComponent implements OnInit {
    instance: TileJSON;
    url: string;
    constructor(layer: LayerTileComponent);
    ngOnInit(): void;
}
