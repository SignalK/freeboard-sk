import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { Polygon } from 'ol/geom';
export declare class GeometryPolygonComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: Polygon;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
