import { OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { MapComponent } from './map.component';
import { GeometryPointComponent } from './geom/geometrypoint.component';
import { GeometryCircleComponent } from './geom/geometrycircle.component';
import { ViewComponent } from './view.component';
import { OverlayComponent } from './overlay.component';
export declare class CoordinateComponent implements OnChanges, OnInit {
    private map;
    private host;
    private mapSrid;
    x: number;
    y: number;
    srid: string;
    constructor(map: MapComponent, viewHost: ViewComponent, geometryPointHost: GeometryPointComponent, geometryCircleHost: GeometryCircleComponent, overlayHost: OverlayComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    private onMapViewChanged;
    private transformCoordinates;
}
