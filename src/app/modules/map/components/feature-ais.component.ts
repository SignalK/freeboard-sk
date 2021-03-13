import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy } from '@angular/core';
import { GeoUtils } from 'src/app/lib/geoutils';

import { Point, LineString, MultiLineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Style, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';


@Component({
    selector: 'xol-ais-vessels',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class AisVesselsComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() aisTargets: any;
    @Input() updateIds= [];
    @Input() staleIds= [];
    @Input() removeIds= [];
    @Input() filterIds= [];
    @Input() focusId: string;
    @Input() icon: string;
    @Input() inactiveIcon: string;
    @Input() focusIcon: string;
    @Input() buddyIcon: string;
    @Input() inactiveTime: number= 180000;  // in ms (3 mins)
    @Input() labelMinZoom: number= 10;
    @Input() vectorMinZoom: number= 15;
    @Input() vectorApparent: boolean= false;
    @Input() mapZoom: number;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';
    private zoomOffsetLevel=[
        1,1000000,550000,290000,140000,70000,
        38000,17000,7600,3900,1900,
        950,470,250,120,60,
        30,15.5,8.1,4,2,
        1,.5,.25,.12,.06,
        .03,.015,.008,1
    ];

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes) { 
        if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
        if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
        if(changes.staleIds) { this.markStaleTargets( changes.staleIds.currentValue) } 
        if(changes.mapZoom) { this.handleZoom(changes.mapZoom) } 
        if(changes.filterIds) { this.updateFeatures(); this.updateVectors(); } 
        if(changes.vectorApparent) { this.updateVectors() } 
        if(changes.focusId) { this.updateFeatures() }
        if(changes.inactiveTime) { this.updateFeatures() }
    }

    formatlabel(label) { return (this.mapZoom < this.labelMinZoom) ? '' : label }

    handleZoom(zoom) {
        let doFeatureUpdate: boolean= true;
        if(!zoom.firstChange) {
            if( (zoom.currentValue<this.labelMinZoom && zoom.previousValue<this.labelMinZoom) || 
                ( zoom.currentValue>=this.labelMinZoom && zoom.previousValue>=this.labelMinZoom) ) { 
                    doFeatureUpdate=false;
            }                                     
        }
        if( doFeatureUpdate) { this.updateFeatures() }
        this.updateVectors();
    }

    updateTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            if(id.indexOf('vessels')!=0) { return }
            let ais= this.aisTargets.get(id);
            if(!ais) { return }
            // ** vessel **
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { //update vessel
                if(ais.position) {
                    f.setGeometry( new Point( fromLonLat(ais.position) ) );
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                }
                else { layer.removeFeature(f) }
            }
            else {  //create vessel
                if(ais.position) {
                    f= new Feature( new Point( fromLonLat(ais.position) ) );
                    f.setId('ais-'+ id);
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                    layer.addFeature(f);
                }
            }   
            // ** wind vector **
            let wf=layer.getFeatureById('wind-'+ id);
            let pos= (ais.position) ? ais.position : [0,0];
            let windDirection= this.getWindDirection(ais);   
            let windc= GeoUtils.destCoordinate( 
                pos[1], pos[0], windDirection, 
                this.zoomOffsetLevel[this.mapZoom]
            );
            if(wf) { // update vector
                if(ais.position && windDirection) { 
                    wf.setGeometry( new LineString( [
                        fromLonLat(ais.position),
                        fromLonLat(windc)
                    ]) );
                    wf.setStyle( new Style( this.setVectorStyle(id) ) );
                }
                else { layer.removeFeature(wf) }
            }
            else { // create vector
                if(ais.position && windDirection) {
                    wf= new Feature( new LineString( [
                        fromLonLat(ais.position),
                        fromLonLat(windc)
                    ]) );
                    wf.setId('wind-'+ id);
                    wf.setStyle( new Style( this.setVectorStyle(id) ) );
                    layer.addFeature(wf);
                }
            }                               
        });
    }

    markStaleTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }    
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { f.setStyle( new Style( this.setTargetStyle(id) ) ) }                      
        });
    }    

    removeTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { layer.removeFeature(f) }
            f=layer.getFeatureById('wind-'+ id);
            if(f) { layer.removeFeature(f) }
            f=layer.getFeatureById('track-'+ id);
            if(f) { layer.removeFeature(f) }
        });   
    }

    getWindDirection(ais:any) {
        return (this.vectorApparent) ? 
            (typeof ais.wind.awa!=='undefined') ? ais.orientation + ais.wind.awa : null 
            : ais.wind.direction; 
    }

    // ** render the AIS wind vectors
    updateVectors() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let id= f.getId().toString();
            let fid= id.slice(5);

            if(id.slice(0,4)=='wind') { //wind vectors
                let ais= this.aisTargets.get(fid);                                 
                let windDirection= this.getWindDirection(ais);          
                if(ais.position && windDirection) { 
                    let windc= GeoUtils.destCoordinate( 
                        ais.position[1], ais.position[0], windDirection, 
                        this.zoomOffsetLevel[this.mapZoom]
                    );                     
                    f.setGeometry( new LineString( [
                        fromLonLat(ais.position),
                        fromLonLat(windc)
                    ]) );
                }             
                f.setStyle( new Style( this.setVectorStyle(fid) ) );
                // ** align vessel position
                let vf=layer.getFeatureById('ais-'+ fid);
                if(vf && ais.position) {
                    vf.setGeometry( new Point( fromLonLat(ais.position) ) );
                }
            }
        });       
    }

    // ** return style to set for wind vector
    setVectorStyle(id: any) {
        let color: string;
        let rgb= (this.vectorApparent) ? '16, 75, 16' : '128, 128, 0';
        if(this.mapZoom<this.vectorMinZoom) { color=`rgba(${rgb},0)` }
        else {  // ** if filtered
            color= ( (this.filterIds && Array.isArray(this.filterIds) ) && this.filterIds.indexOf(id)==-1 ) ?
            `rgba(${rgb},0)` : `rgba(${rgb},1)`;
        }
        return {                    
            stroke: new Stroke({
                width: 2,
                color: color
            })
        };
    }     

    // ** render the AIS features with updated styles
    updateFeatures() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            if(fid.slice(0,3)=='ais') { //vessel features
                f.setStyle( new Style( this.setTargetStyle(fid.slice(4)) ) );
            }
        });
    }

    // ** return style to set for target id
    setTargetStyle(id: any) {
        if(!id) { return }
        let target= this.aisTargets.get(id);
        if(!target) { return }
        let label= this.formatlabel( target.name || target.callsign || target.mmsi || '');
        let fstyle: any;
        // ** check if stale 
        let now= new Date().valueOf();
        let icon= (target.buddy && this.buddyIcon) ? this.buddyIcon: this.icon;
        icon= (target.lastUpdated< (now-this.inactiveTime) ) ? this.inactiveIcon : icon;
        // ** if filtered
        if( (this.filterIds && Array.isArray(this.filterIds) ) && this.filterIds.indexOf(id)==-1 ) { 
            // hide feature
            fstyle= {                    
                image: new Icon({
                    src: icon,
                    rotateWithView: true,
                    rotation: target.orientation,
                    opacity: 0
                })
            }         
        }
        else { // show feature
            if(id==this.focusId && this.focusIcon) {
                fstyle= {                    
                    image: new Icon({
                        src: this.focusIcon,
                        rotateWithView: true,
                        rotation: target.orientation,
                        opacity: 1,
                        size: [50,50],
                        scale: .75,
                        anchor: [9.5,22.5],
                        anchorXUnits: 'pixels',
                        anchorYUnits: 'pixels'
                    })
                }
            }
            else {            
                fstyle= {
                    image: new Icon({
                        src: icon,
                        rotateWithView: true,
                        rotation: target.orientation,
                        opacity: 1
                    }),
                    text: new Text({
                        text: label,
                        offsetY: -12
                    })
                }
            }
        }
        return fstyle;
    }

}
