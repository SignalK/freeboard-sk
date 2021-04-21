import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy, 
        SimpleChange, SimpleChanges } from '@angular/core';
import { GeoUtils } from 'src/app/lib/geoutils';

import { Point, LineString, MultiLineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Style, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';
import { SKSaR } from 'src/app/modules/skresources';


@Component({
    selector: 'ais-sar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class SaRComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() sar: Map<string,SKSaR>
    @Input() updateIds= [];
    @Input() staleIds= [];
    @Input() removeIds= [];
    @Input() icon: string;
    @Input() inactiveIcon: string;
    @Input() inactiveTime: number= 180000;  // in ms (3 mins)
    @Input() labelMinZoom: number= 10;
    @Input() mapZoom: number;
    
    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes: SimpleChanges) { 
        if(changes.sar && changes.sar.firstChange) { 
            if(this.sar) {
                let ids: Array<string>= [];
                this.sar.forEach( (v:any,k:string)=> { 
                    ids.push(k);
                });
                this.updateTargets(ids);
            }
        }
        else {
            if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
            if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
            if(changes.staleIds) { this.markStaleTargets( changes.staleIds.currentValue) } 
            if(changes.mapZoom) { this.handleZoom(changes.mapZoom) } 
            if(changes.inactiveTime) { this.updateFeatures() }
        }
    }

    formatlabel(label:string) { return (this.mapZoom < this.labelMinZoom) ? '' : label }

    handleZoom(zoom: SimpleChange) {
        let doFeatureUpdate: boolean= true;
        if(!zoom.firstChange) {
            if( (zoom.currentValue<this.labelMinZoom && zoom.previousValue<this.labelMinZoom) || 
                ( zoom.currentValue>=this.labelMinZoom && zoom.previousValue>=this.labelMinZoom) ) { 
                    doFeatureUpdate=false;
            }                                     
        }
        if( doFeatureUpdate) { this.updateFeatures() }
    }

    updateTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            if(id.indexOf('sar')!=0) { return }
            let ais= this.sar.get(id);
            if(!ais) { return }
            // ** sar **
            let f=layer.getFeatureById(id);
            if(f) { //update sar
                if(ais.position) {
                    f.setGeometry( new Point( fromLonLat(ais.position) ) );
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                }
                else { layer.removeFeature(f) }
            }
            else {  //create sar
                if(ais.position) {
                    f= new Feature( new Point( fromLonLat(ais.position) ) );
                    f.setId(id);
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                    layer.addFeature(f);
                }
            }                              
        });
    }

    markStaleTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }    
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            let f=layer.getFeatureById(id);
            if(f) { f.setStyle( new Style( this.setTargetStyle(id) ) ) }                      
        });
    }    

    removeTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            if(id.indexOf('sar')!=0) { return }
            let f=layer.getFeatureById(id);
            if(f) { layer.removeFeature(f) }
        });   
    }   

    // ** render the AIS features with updated styles
    updateFeatures() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            if(fid.slice(0,8)=='sar') { //sar features
                f.setStyle( new Style( this.setTargetStyle(fid.slice(4)) ) );
            }
        });
    }

    // ** return style to set for target id
    setTargetStyle(id: string) {
        if(!id) { return }
        let target= this.sar.get(id);
        if(!target) { return }
        let label= this.formatlabel( target.name || target.mmsi || '');
        let fstyle: any;
        // ** check if stale 
        let now= new Date().valueOf();
        let icon= ( (target.lastUpdated as any)< (now-this.inactiveTime) ) ? 
            (this.inactiveIcon) ? this.inactiveIcon : this.icon :
            this.icon;
        // ** show feature
        fstyle= {
            image: new Icon({
                src: icon,
                rotateWithView: false,
                opacity: 1
            }),
            text: new Text({
                text: label,
                offsetY: -12
            })
        }
        return fstyle;
    } 

}
