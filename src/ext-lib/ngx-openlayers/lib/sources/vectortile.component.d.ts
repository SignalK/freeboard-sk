import { AfterContentInit } from '@angular/core';
import { VectorTile } from 'ol';
import Feature from 'ol/format/Feature';
import TileGrid from 'ol/tilegrid/TileGrid';
import { LayerVectorTileComponent } from '../layers/layervectortile.component';
import { FormatComponent } from '../formats/format.component';
import { TileGridComponent } from '../tilegrid.component';
import { SourceComponent } from './source.component';
import { ProjectionLike } from 'ol/proj';
import { UrlFunction } from 'ol/Tile';
export declare class SourceVectorTileComponent extends SourceComponent implements AfterContentInit {
    instance: VectorTile;
    cacheSize: number;
    overlaps: boolean;
    projection: ProjectionLike;
    tilePixelRatio: number;
    tileUrlFunction: UrlFunction;
    url: string;
    urls: string[];
    wrapX: boolean;
    formatComponent: FormatComponent;
    format: Feature;
    tileGridComponent: TileGridComponent;
    tileGrid: TileGrid;
    constructor(layer: LayerVectorTileComponent);
    ngAfterContentInit(): void;
}
