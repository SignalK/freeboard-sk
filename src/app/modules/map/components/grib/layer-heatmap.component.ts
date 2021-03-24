import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Heatmap as HeatmapLayer } from 'ol/layer';
import { Vector } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { transform } from 'ol/proj';
import { MapComponent } from 'ngx-openlayers';

export interface HeatmapValue {
    coord: [number,number];
    value: number;
}

@Component({
    selector: 'fb-grib-heatmap',
    template: `<ng-content></ng-content>`
})
export class LayerHeatmapComponent implements OnInit, OnDestroy, OnChanges {
    
    @Input() map: MapComponent;
    @Input() values: Array<HeatmapValue>;
    @Input() blur: number= 15;
    @Input() radius: number= 5;
    @Input() gradient: Array<string>;
    @Input() zIndex: number;

    private layer: HeatmapLayer;
    
    constructor() { }

    ngOnInit() { 
        if(this.map) {
            this.layer= new HeatmapLayer({
                source: new Vector(),
                blur: this.blur,
                radius: this.radius
            });
            if(this.gradient) { this.layer.setGradient(this.gradient) }
            if(this.zIndex) { this.layer.setZIndex(this.zIndex) }
            this.map.instance.addLayer(this.layer);
            this.renderValues();
        }
    }

    ngOnChanges(changes: SimpleChanges) {

        if(changes.blur && changes.blur.currentValue && this.layer) {
            this.layer.setBlur(changes.blur.currentValue);
        }
        if(changes.radius && changes.radius.currentValue && this.layer) {
            this.layer.setRadius(changes.radius.currentValue);
        }       
        if(changes.gradient && changes.gradient.currentValue && this.layer) {
            this.layer.setGradient(changes.gradient.currentValue);
        } 
        if(changes.zIndex && changes.zIndex.currentValue && this.layer) {
            this.layer.setZIndex(changes.zIndex.currentValue);
        }                  
        if(changes.values && changes.values.currentValue) { this.renderValues() }
    }

    ngOnDestroy() {
        this.map.instance.removeLayer(this.layer);
        this.layer= null;
    }

    renderValues() {
        if(!this.layer) { return }
        let mrid= 'EPSG:3857';
        let srid= 'EPSG:4326';
        let features= [];
        let f: Feature;
        let source= new Vector();

        if(!this.values || this.values.length==0) { return }
        this.values.forEach( v=> {
            f= new Feature( new Point( transform( v.coord, srid, mrid ) ) );
            f.set('weight', v.value);
            features.push(f);
        })
        source.addFeatures(features);
        this.layer.setSource(source);
    }
}