import { OnInit } from '@angular/core';
import { Fill, Image, Stroke, Style, Text } from 'ol/style';
import { Geometry } from 'ol/geom';
import { FeatureComponent } from '../feature.component';
import { LayerVectorComponent } from '../layers/layervector.component';
import { GeometryFunction } from 'ol/style/Style';
export declare class StyleComponent implements OnInit {
    private host;
    instance: Style;
    componentType: string;
    geometry: string | Geometry | GeometryFunction;
    fill: Fill;
    image: Image;
    stroke: Stroke;
    text: Text;
    zIndex: number;
    constructor(featureHost: FeatureComponent, layerHost: LayerVectorComponent);
    update(): void;
    ngOnInit(): void;
}
