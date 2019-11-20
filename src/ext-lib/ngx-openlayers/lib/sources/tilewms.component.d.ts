import { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LayerTileComponent } from '../layers/layertile.component';
import { SourceComponent } from './source.component';
import { TileWMS } from 'ol/source';
import { TileGrid } from 'ol/tilegrid';
import { LoadFunction } from 'ol/Tile';
export declare class SourceTileWMSComponent extends SourceComponent implements OnChanges, OnInit {
    instance: TileWMS;
    cacheSize: number;
    crossOrigin: string;
    gutter: number;
    hidpi: boolean;
    params: Object;
    projection: string;
    reprojectionErrorThreshold: number;
    serverType: string;
    tileGrid: TileGrid;
    tileLoadFunction: LoadFunction;
    url: string;
    urls: string[];
    wrapX: boolean;
    constructor(layer: LayerTileComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
