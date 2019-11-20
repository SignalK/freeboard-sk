import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { Circle } from 'ol/geom';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
export declare class GeometryCircleComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: Circle;
    radius: number;
    constructor(map: MapComponent, host: FeatureComponent);
}
