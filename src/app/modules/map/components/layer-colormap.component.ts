import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { transform } from 'ol/proj';
import { Style, Fill, Stroke } from 'ol/style';
import {asArray} from 'ol/color';

import { MapComponent } from 'ngx-openlayers';


export interface ColormapValue {
    coord: [number,number]; // ** [x,y]
    value: number;          // ** radians
}

export interface ColormapGradient {
    lo: number | null;     // ** range low value
    hi: number | null;     // ** range hi value
    color: Array<number> | string;  // ** color value
}

@Component({
    selector: 'xol-layer-colormap',
    template: `<ng-content></ng-content>`
})
export class LayerColormapComponent implements OnInit, OnDestroy, OnChanges {
    
    @Input() map: MapComponent;
    @Input() zIndex: number;
    @Input() values: Array<ColormapValue>= [];
    @Input() gradient: Array<ColormapGradient>= [
        {lo: null, hi: 0, color: 'blue' },
        {lo: 0, hi: 10, color: 'cyan' },
        {lo: 10, hi: 20, color: 'yellow' },
        {lo: 20, hi: 30, color: 'orange' },
        {lo: 30, hi: null, color: 'red' }
    ];
    @Input() opacity:number=.6;
    
    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    private layer: VectorLayer;
    
    constructor() { }

    ngOnInit() { 
        if(this.map) {
            this.layer= new VectorLayer({
                source: new Vector(),
            });
            if(this.zIndex) { this.layer.setZIndex(this.zIndex) }
            this.map.instance.addLayer(this.layer);
            this.parseValues();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if(changes.zIndex && changes.zIndex.currentValue && this.layer) {
            this.layer.setZIndex(changes.zIndex.currentValue);
        }                  
        if( (changes.values && changes.values.currentValue) ||
            (changes.gradient && changes.gradient.currentValue) ||
            (changes.opacity && changes.opacity.currentValue 
                && changes.opacity.currentValue>0
                && changes.opacity.currentValue<=1)) { this.parseValues() }
    }

    ngOnDestroy() {
        this.map.instance.removeLayer(this.layer);
        this.layer= null;
    }

    // parse and plot values
    parseValues() {
        if(!this.layer) { return }
        let mrid= 'EPSG:3857';
        let srid= 'EPSG:4326';
        let features= [];
        let f: Feature;
        let source= new Vector();

        if(!this.values || this.values.length==0) { return }
        this.values.forEach( v=> {
            let ca= [ 
                transform([v.coord[0]-.5,v.coord[1]-.5], srid, mrid ),  
                transform([v.coord[0]+.5,v.coord[1]-.5], srid, mrid ),
                transform([v.coord[0]+.5,v.coord[1]+.5], srid, mrid ),
                transform([v.coord[0]-.5,v.coord[1]+.5], srid, mrid ),
                transform([v.coord[0]-.5,v.coord[1]-.5], srid, mrid )
            ]
            f= new Feature( new Polygon([ca]) );
            f.setStyle( new Style( this.pointStyle(v.value) ) );
            features.push(f);
        }); 
        source.addFeatures(features);
        this.layer.setSource(source);
    }

    // ** return style to set for value
    pointStyle(value:number) {
        return {
            fill: this.setFillStyle(value),
            stroke: new Stroke({color: 'transparent'})
        }
    }
    
    // ** calculate Fill style based on value
    setFillStyle(value: number) { 
        let fillStyle= new Fill();        
        
        this.gradient.forEach(i=> {
            if(i.lo===null && value<=i.hi) { fillStyle.setColor(i.color) }
            else if(i.hi===null && value>i.lo) { fillStyle.setColor(i.color) }
            else if(value>i.lo && value<=i.hi) { fillStyle.setColor(i.color) }
        });

        let col= fillStyle.getColor();
        if(typeof col==='string') {
            let c= asArray( col );
            c[3]= this.opacity;
            fillStyle.setColor(c);
        }
        return fillStyle;
    }
    
}