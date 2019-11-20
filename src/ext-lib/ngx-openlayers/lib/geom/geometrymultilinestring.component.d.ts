import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { MultiLineString } from 'ol/geom';
export declare class GeometryMultiLinestringComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: MultiLineString;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
