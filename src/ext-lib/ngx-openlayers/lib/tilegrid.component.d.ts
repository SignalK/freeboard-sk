import { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import TileGrid from 'ol/tilegrid/TileGrid';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { Size } from 'ol/size';
export declare class TileGridComponent implements OnInit, OnChanges {
    instance: TileGrid;
    extent: Extent;
    maxZoom: number;
    minZoom: number;
    tileSize: number | Size;
    origin?: Coordinate;
    resolutions: number[];
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
