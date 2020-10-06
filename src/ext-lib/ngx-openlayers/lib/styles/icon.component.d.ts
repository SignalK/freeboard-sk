import { OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Icon } from 'ol/style';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';
import IconOrigin from 'ol/style/IconOrigin';
import { StyleComponent } from './style.component';
export declare class StyleIconComponent implements OnInit, OnChanges {
    private host;
    instance: Icon;
    anchor: [number, number];
    anchorXUnits: IconAnchorUnits;
    anchorYUnits: IconAnchorUnits;
    anchorOrigin: IconOrigin;
    color: [number, number, number, number];
    crossOrigin: IconOrigin;
    img: string;
    offset: [number, number];
    offsetOrigin: IconOrigin;
    opacity: number;
    scale: number;
    snapToPixel: boolean;
    rotateWithView: boolean;
    rotation: number;
    size: [number, number];
    imgSize: [number, number];
    src: string;
    constructor(host: StyleComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
