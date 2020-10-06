import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { MultiPolygon } from 'ol/geom';
export declare class GeometryMultiPolygonComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: MultiPolygon;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
