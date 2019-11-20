import { OnDestroy, OnInit } from '@angular/core';
import { Rotate } from 'ol/control';
import { MapComponent } from '../map.component';
export declare class ControlRotateComponent implements OnInit, OnDestroy {
    private map;
    instance: Rotate;
    className: string;
    label: string;
    tipLabel: string;
    duration: number;
    autoHide: boolean;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
