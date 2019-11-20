import { OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Layer } from 'ol/layer';
import { View } from 'ol';
import { OverviewMap } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlOverviewMapComponent implements OnInit, OnChanges, OnDestroy {
    private map;
    instance: OverviewMap;
    collapsed: boolean;
    collapseLabel: string;
    collapsible: boolean;
    label: string;
    layers: Layer[];
    target: Element;
    tipLabel: string;
    view: View;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
    ngOnChanges(changes: SimpleChanges): void;
    private reloadInstance;
}
