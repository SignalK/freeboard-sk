import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { LineString } from 'ol/geom';
export declare class GeometryLinestringComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: LineString;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
