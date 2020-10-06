import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { SimpleGeometryComponent } from './simplegeometry.component';
import { MapComponent } from '../map.component';
import { MultiPoint } from 'ol/geom';
export declare class GeometryMultiPointComponent extends SimpleGeometryComponent implements OnInit {
    componentType: string;
    instance: MultiPoint;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
