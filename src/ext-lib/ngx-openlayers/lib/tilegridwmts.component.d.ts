import { OnInit } from '@angular/core';
import WMTS from 'ol/tilegrid/WMTS';
import { TileGridComponent } from './tilegrid.component';
import { Coordinate } from 'ol/coordinate';
import { Size } from 'ol/size';
export declare class TileGridWMTSComponent extends TileGridComponent implements OnInit {
    instance: WMTS;
    origin?: Coordinate;
    origins?: Coordinate[];
    resolutions: number[];
    matrixIds: string[];
    sizes?: Size[];
    tileSizes?: (number | Size)[];
    widths?: number[];
    ngOnInit(): void;
}
