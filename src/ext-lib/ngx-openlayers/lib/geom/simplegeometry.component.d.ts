import { OnInit } from '@angular/core';
import { FeatureComponent } from '../feature.component';
import { MapComponent } from '../map.component';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
export declare abstract class SimpleGeometryComponent implements OnInit {
    protected map: MapComponent;
    protected host: FeatureComponent;
    instance: SimpleGeometry;
    componentType: string;
    srid: string;
    constructor(map: MapComponent, host: FeatureComponent);
    ngOnInit(): void;
}
