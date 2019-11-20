import { OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Fill } from 'ol/style';
import { StyleComponent } from './style.component';
import { StyleCircleComponent } from './circle.component';
import { StyleTextComponent } from './text.component';
import { Color } from 'ol/color';
import { ColorLike } from 'ol/colorlike';
export declare class StyleFillComponent implements OnInit, OnChanges {
    private host;
    instance: Fill;
    color: Color | ColorLike;
    constructor(styleHost: StyleComponent, styleCircleHost: StyleCircleComponent, styleTextHost: StyleTextComponent);
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
}
