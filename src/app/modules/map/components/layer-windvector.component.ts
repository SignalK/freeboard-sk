import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { transform } from 'ol/proj';
import { Style, Icon } from 'ol/style';
import { MapComponent } from 'ngx-openlayers';
import { Convert } from 'src/app/lib/convert';

export interface WindVector {
    coord: [number,number]; // ** [x,y]
    angle: number;          // ** radians
    speed: number;          // ** m/sec
}

@Component({
    selector: 'xol-layer-windvector',
    template: `<ng-content></ng-content>`
})
export class LayerWindVectorComponent implements OnInit, OnDestroy, OnChanges {
    
    @Input() map: MapComponent;
    @Input() zIndex: number;
    @Input() values: Array<WindVector>= [];
    
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
        if(changes.values && changes.values.currentValue) { this.parseValues() }
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
            f= new Feature( new Point( transform( v.coord, srid, mrid ) ) );
            f.setStyle( new Style( this.setIcon(v.angle, v.speed) ) );
            features.push(f);
        }); 
        source.addFeatures(features);
        this.layer.setSource(source);
    }

    // ** return style to set for vector value
    setIcon(angle:number, speed:number=0) {
        if(!angle) { return }
        let fstyle: any;
        let icon= "./assets/img/wind/windbarbs-~.png";
        let anchor= [14,105];
        speed= Convert.msecToKnots(speed);
        if(speed<3) { icon= icon.replace("~", 'calm') }
        if(speed>=3 && speed<8) { icon= icon.replace("~", '5') }
        if(speed>=8 && speed<13) { icon= icon.replace("~", '10') }
        if(speed>=13 && speed<18) { icon= icon.replace("~", '15') }
        if(speed>=18 && speed<23) { icon= icon.replace("~", '20') }
        if(speed>=23 && speed<28) { icon= icon.replace("~", '25') }
        if(speed>=28 && speed<33) { icon= icon.replace("~", '30') }
        if(speed>=33 && speed<38) { icon= icon.replace("~", '35') }
        if(speed>=38 && speed<43) { icon= icon.replace("~", '40') }
        if(speed>=43 && speed<48) { icon= icon.replace("~", '45') }
        if(speed>=48 && speed<53) { icon= icon.replace("~", '50') }
        if(speed>=53 && speed<58) { icon= icon.replace("~", '55') }
        if(speed>=58 && speed<63) { icon= icon.replace("~", '60') }
        if(speed>=63 && speed<68) { icon= icon.replace("~", '65') }
  
        fstyle= {
            image: new Icon({
                src: icon,
                rotateWithView: true,
                rotation: angle,
                opacity: 1,
                size: [35,118],
                scale: .5,
                anchor: anchor,
                anchorXUnits: 'pixels',
                anchorYUnits: 'pixels'
            })
        }
        return fstyle;
    }    
    
}