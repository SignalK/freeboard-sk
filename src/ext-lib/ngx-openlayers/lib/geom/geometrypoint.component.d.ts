import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { Point } from 'ol/geom';
export declare class GeometryPointComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: Point;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
