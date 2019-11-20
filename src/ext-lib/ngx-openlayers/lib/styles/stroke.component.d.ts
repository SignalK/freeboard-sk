import { OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Stroke } from 'ol/style';
import { StyleComponent } from './style.component';
import { StyleCircleComponent } from './circle.component';
import { StyleTextComponent } from './text.component';
import { Color } from 'ol/color';
export declare class StyleStrokeComponent implements OnInit, OnChanges {
    instance: Stroke;
    private host;
    color: Color | undefined;
    lineCap: string | undefined;
    lineDash: number[] | undefined;
    lineJoin: string | undefined;
    miterLimit: number | undefined;
    width: number | undefined;
    constructor(styleHost: StyleComponent, styleCircleHost: StyleCircleComponent, styleTextHost: StyleTextComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
