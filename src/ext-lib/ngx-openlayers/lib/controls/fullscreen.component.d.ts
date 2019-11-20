import { OnDestroy, OnInit } from '@angular/core';
import { FullScreen } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlFullScreenComponent implements OnInit, OnDestroy {
    private map;
    instance: FullScreen;
    className: string;
    label: string;
    labelActive: string;
    tipLabel: string;
    keys: boolean;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
