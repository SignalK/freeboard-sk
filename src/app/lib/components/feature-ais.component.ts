import { Component, OnInit, OnDestroy, OnChanges, Input } from '@angular/core';
import { geom, proj, style, Feature } from 'openlayers';
import { SourceVectorComponent } from 'ngx-openlayers';
import {GeoUtils} from '../geoutils';
import {AppInfo} from '../../app.info';


@Component({
    selector: 'xol-ais-targets',
    template: `<ng-content></ng-content>`
})
export class AisTargetsComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() aisTargets: any;
    @Input() updateIds= [];
    @Input() staleIds= [];
    @Input() removeIds= [];
    @Input() filterIds= [];
    @Input() icon: string;
    @Input() inactiveIcon: string;
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

    constructor(private host: SourceVectorComponent, private app: AppInfo) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes) { 
        if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
        if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
        if(changes.staleIds) { this.markStaleTargets( changes.staleIds.currentValue) } 
        if(changes.mapZoom) { this.handleZoom(changes.mapZoom) } 
        if(changes.filterIds) { this.updateFeatures(); this.updateVectors(); } 
        if(changes.vectorApparent) { this.updateVectors() } 
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

    updateTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            let ais= this.aisTargets.get(id);
            // ** vessel **
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { //update vessel
                if(ais.position) {
                    f.setGeometry( new geom.Point( proj.transform( ais.position, this.srid, this.mrid ) ) );
                    f.setStyle( new style.Style( this.setTargetStyle(id) ) );
                }
                else { layer.removeFeature(f) }
            }
            else {  //create vessel
                if(ais.position) {
                    f= new Feature( new geom.Point( proj.transform( ais.position, this.srid, this.mrid ) ) );
                    f.setId('ais-'+ id);
                    f.setStyle( new style.Style( this.setTargetStyle(id) ) );
                    layer.addFeature(f);
                }
            }   
            // ** wind vector **
            let wf=layer.getFeatureById('wind-'+ id);
            let pos= (ais.position) ? ais.position : [0,0];
            let windDirection= (this.vectorApparent) ? 
                (ais.wind.awa && ais.cogTrue) ? ais.cogTrue + ais.wind.awa : null 
                : ais.wind.twd;  
            let windc= GeoUtils.destCoordinate( 
                pos[1], pos[0], windDirection, 
                this.zoomOffsetLevel[this.mapZoom]
            );
            if(wf) { // update vector
                if(ais.position && windDirection) { 
                    wf.setGeometry( new geom.LineString( [
                        proj.transform( ais.position, this.srid, this.mrid ),
                        proj.transform( windc, this.srid, this.mrid )
                    ]) );
                    wf.setStyle( new style.Style( this.setVectorStyle(id) ) );
                }
                else { layer.removeFeature(wf) }
            }
            else { // create vector
                if(ais.position && windDirection) {
                    wf= new Feature( new geom.LineString( [
                            proj.transform( ais.position, this.srid, this.mrid ),
                            proj.transform( windc, this.srid, this.mrid )
                    ]) );
                    wf.setId('wind-'+ id);
                    wf.setStyle( new style.Style( this.setVectorStyle(id) ) );
                    layer.addFeature(wf);
                }
            }                     
        });
    }

    markStaleTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }     
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            let ais= this.aisTargets.get(id);
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { f.setStyle( new style.Style( this.setTargetStyle(id) ) ) }                      
        });
    }    

    removeTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { layer.removeFeature(f) }
            f=layer.getFeatureById('wind-'+ id);
            if(f) { layer.removeFeature(f) }            
            this.aisTargets.delete(id);
        });   
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
                let windDirection= (this.vectorApparent) ? 
                    (ais.wind.awa && ais.cogTrue) ? ais.cogTrue + ais.wind.awa : null 
                    : ais.wind.twd;           
                if(ais.position && windDirection) { 
                    let windc= GeoUtils.destCoordinate( 
                        ais.position[1], ais.position[0], windDirection, 
                        this.zoomOffsetLevel[this.mapZoom]
                    );                     
                    f.setGeometry( new geom.LineString( [
                        proj.transform( ais.position, this.srid, this.mrid ),
                        proj.transform( windc, this.srid, this.mrid )
                    ]) );
                }             
                f.setStyle( new style.Style( this.setVectorStyle(fid) ) );
                // ** align vessel position
                let vf=layer.getFeatureById('ais-'+ fid);
                if(vf && ais.position) {
                    vf.setGeometry( new geom.Point( proj.transform( ais.position, this.srid, this.mrid ) ) );
                }
            }
        });       
    }

    // ** return style to set for wind vector
    setVectorStyle(id: any) {
        let color: string;
        let rgb= '255,0,0';
        if(this.mapZoom<this.vectorMinZoom) { color=`rgba(${rgb},0)` }
        else {  // ** if filtered
            color= ( (this.filterIds && Array.isArray(this.filterIds) ) && this.filterIds.indexOf(id)==-1 ) ?
            `rgba(${rgb},0)` : `rgba(${rgb},1)`;
        }
        let fstyle= {                    
            stroke: new style.Stroke({
                width: 2,
                color: color,
            })
        }
        return fstyle;
    }     

    // ** render the AIS features with updated styles
    updateFeatures() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            if(fid.slice(0,3)=='ais') { //vessel features
                f.setStyle( new style.Style( this.setTargetStyle(fid.slice(4)) ) );
            }
        });
    }

    // ** return style to set for target id
    setTargetStyle(id: any) {
        if(!id) { return }
        let target= this.aisTargets.get(id);      
        let rotation= target.heading || target.cogTrue;
        let label= this.formatlabel( target.name || target.callsign || target.mmsi || '');
        let fstyle: any;
        // ** check if stale 
        let now= new Date().valueOf();
        let icon= (target.lastUpdated< (now-this.inactiveTime) ) ? this.inactiveIcon : this.icon
        // ** if filtered
        if( (this.filterIds && Array.isArray(this.filterIds) ) && this.filterIds.indexOf(id)==-1 ) { 
            // hide feature
            fstyle= {                    
                image: new style.Icon({
                    src: icon,
                    rotateWithView: true,
                    rotation: rotation,
                    opacity: 0
                })
            }
        }
        else { // show feature
            fstyle= {
                image: new style.Icon({
                    src: icon,
                    rotateWithView: true,
                    rotation: rotation,
                    opacity: 1
                }),
                text: new style.Text({
                    text: label,
                    offsetY: -12
                })
            }
        }
        return fstyle;
    }    

}
