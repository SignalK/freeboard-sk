import { OnInit } from '@angular/core';
import { BingMaps } from 'ol/source';
import { SourceComponent } from './source.component';
import { LayerTileComponent } from '../layers/layertile.component';
import { LoadFunction } from 'ol/Tile';
export declare class SourceBingmapsComponent extends SourceComponent implements OnInit {
    instance: BingMaps;
    cacheSize: number;
    hidpi: boolean;
    culture: string;
    key: string;
    imagerySet: 'Road' | 'Aerial' | 'AerialWithLabels' | 'collinsBart' | 'ordnanceSurvey';
    maxZoom: number;
    reprojectionErrorThreshold: number;
    tileLoadFunction: LoadFunction;
    wrapX: boolean;
    constructor(layer: LayerTileComponent);
    ngOnInit(): void;
}
