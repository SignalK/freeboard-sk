import { FormatComponent } from './format.component';
import { MVT } from 'ol/format';
import { Geometry } from 'ol/geom';
import GeometryType from 'ol/geom/GeometryType';
export declare class FormatMVTComponent extends FormatComponent {
    instance: MVT;
    featureClass: ((geom: Geometry | {
        [k: string]: any;
    }) => any) | ((geom: GeometryType, arg2: number[], arg3: number[] | number[][], arg4: {
        [k: string]: any;
    }) => any);
    geometryName: string;
    layerName: string;
    layers: string[];
    constructor();
}
