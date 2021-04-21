import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';

import { Point } from 'ol/geom';
import { transform, fromLonLat } from 'ol/proj';
import { Style, Stroke, Text, Fill, RegularShape } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';
import { SKAtoN } from 'src/app/modules/skresources/resource-classes';

@Component({
    selector: 'fb-context-atons',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class AtoNsComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() atons: Map<string,SKAtoN>;
    @Input() updateIds= [];
    @Input() removeIds= [];
    @Input() mapZoom: number;
    @Input() minZoomLevel: number=10;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes:SimpleChanges) { 
        if(changes.atons && changes.atons.firstChange) { 
            if(this.atons) {
                let ids: Array<string>= [];
                this.atons.forEach( (v:any,k:string)=> { 
                    ids.push(k);
                });
                this.updateTargets(ids);
            }
        }
        else {
            if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
            if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
            if(changes.mapZoom) { this.handleZoom(changes.mapZoom) }
        }
    }

    handleZoom(zoom) {
        let doFeatureUpdate: boolean= true;
        if(!zoom.firstChange) {
            if(zoom.currentValue<this.minZoomLevel && zoom.previousValue<this.minZoomLevel) { 
                doFeatureUpdate=false;
            }                                     
        }
        if( doFeatureUpdate) { this.updateFeatures() }
    }

    // ** render the map features with updated styles
    updateFeatures() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            f.setStyle( new Style( this.setTargetStyle(fid) ) );
        });
    }

    // ** return style to set for target id
    setTargetStyle(id: any) {
        if(!id) { return }
        let fstyle= {
            image: new RegularShape({
                points: (id.indexOf('basestation')!=-1) ? 3 : 4,
                radius: 10,
                stroke: new Stroke({ 
                    color: `rgba(0,0,0,${(this.mapZoom < this.minZoomLevel) ? 0 : 1})`, 
                    width: 1 
                }),
                fill: new Fill({ color: 'transparent' }),                 
            }),
            text: new Text({
                text: '+',
                offsetX: -0.5,
                offsetY: 0.5
            })           
        }
        return fstyle;
    }  

    updateTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            if(id.indexOf('atons')!=0) { return }
            let aton= this.atons.get(id);
            if(!aton) { return }
            // ** aton **
            let f=layer.getFeatureById(id);
            if(f) { //update aton
                if(aton.position) {
                    f.setGeometry( new Point( fromLonLat(aton.position) ) );
                }
                else { layer.removeFeature(f) }
            }
            else {  //create aton
                if(aton.position) {
                    f= new Feature( new Point( fromLonLat(aton.position) ) );
                    f.setId(id);
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                    layer.addFeature(f);
                }
            }               
        });
    }

    removeTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            let f=layer.getFeatureById(id);
            if(f) { layer.removeFeature(f) }
        });   
    }

}
