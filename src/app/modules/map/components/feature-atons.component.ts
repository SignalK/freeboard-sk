import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy } from '@angular/core';

import { Point } from 'ol/geom';
import { transform } from 'ol/proj';
import { Style, Stroke, Text, Fill, RegularShape } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';

@Component({
    selector: 'xol-atons',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class AtoNsComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() atons: Array<any>= [];
    @Input() mapZoom: number;
    @Input() minZoomLevel: number=10;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes) { 
        if( (changes.atons && changes.atons.currentValue) ||
            (changes.minZoomLevel && typeof changes.minZoomLevel.currentValue!=='undefined') ||
            (changes.mapZoom && typeof changes.mapZoom.currentValue!=='undefined') ) { 
            this.setTargets();
        } 
    }

    // add features to map
    setTargets() {
        if(!this.host.instance) { return }
        if(!this.atons) { return }
        let layer= this.host.instance;
        layer.clear(true);
        if(this.mapZoom < this.minZoomLevel) { return }
        this.atons.forEach( v=> {
            let f= new Feature( new Point( transform(v.position, this.srid, this.mrid) ) );
            f.setId(v.id);
            f.setStyle( new Style( {
                image: new RegularShape({
                    points: (v.type.name=='Basestation') ? 3 : 4,
                    radius: 10,
                    stroke: new Stroke({ color: 'black', width: 1 }),
                    fill: new Fill({ color: 'transparent' })                   
                }),
                text: new Text({
                    text: '+',
                    offsetX: -0.5,
                    offsetY: 0.5
                })           
            } ) );
            layer.addFeature(f);
        });          
    }  

}
