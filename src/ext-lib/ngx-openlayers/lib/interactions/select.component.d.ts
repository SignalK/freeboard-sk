import { OnDestroy, OnInit, EventEmitter } from '@angular/core';
import { MapComponent } from '../map.component';
import { Select } from 'ol/interaction';
import { Layer } from 'ol/layer';
import { Style } from 'ol/style';
import { Collection, Feature } from 'ol';
import { FilterFunction } from 'ol/interaction/Select';
import { StyleFunction } from 'ol/style/Style';
import { Condition } from 'ol/events/condition';
export declare class SelectInteractionComponent implements OnInit, OnDestroy {
    private map;
    instance: Select;
    addCondition?: Condition;
    condition?: Condition;
    layers?: Layer[] | ((layer: Layer) => boolean);
    style?: Style | Style[] | StyleFunction;
    removeCondition?: Condition;
    toggleCondition?: Condition;
    multi?: boolean;
    features?: Collection<Feature>;
    filter?: FilterFunction;
    wrapX?: boolean;
    onChange: EventEmitter<any>;
    onSelect: EventEmitter<any>;
    onPropertyChange: EventEmitter<any>;
    constructor(map: MapComponent);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
