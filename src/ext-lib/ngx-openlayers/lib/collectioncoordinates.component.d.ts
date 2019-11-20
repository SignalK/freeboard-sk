import { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MapComponent } from './map.component';
import { GeometryLinestringComponent } from './geom/geometrylinestring.component';
import { GeometryPolygonComponent } from './geom/geometrypolygon.component';
import { GeometryMultiPointComponent } from './geom/geometrymultipoint.component';
import { GeometryMultiLinestringComponent } from './geom/geometrymultilinestring.component';
import { GeometryMultiPolygonComponent } from './geom/geometrymultipolygon.component';
import { Coordinate } from 'ol/coordinate';
export declare class CollectionCoordinatesComponent implements OnChanges, OnInit {
    private map;
    private host;
    private mapSrid;
    coordinates: Coordinate[] | Coordinate[][] | Coordinate[][][];
    srid: string;
    constructor(map: MapComponent, geometryLinestring: GeometryLinestringComponent, geometryPolygon: GeometryPolygonComponent, geometryMultipoint: GeometryMultiPointComponent, geometryMultilinestring: GeometryMultiLinestringComponent, geometryMultipolygon: GeometryMultiPolygonComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    private onMapViewChanged;
    private transformCoordinates;
}
