import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy, 
        SimpleChange, SimpleChanges } from '@angular/core';
import { GeoUtils } from 'src/app/lib/geoutils';

import { Point, LineString, MultiLineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Style, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';


@Component({
    selector: 'xol-aircraft',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class AircraftComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() aircraft: any;
    @Input() updateIds= [];
    @Input() staleIds= [];
    @Input() removeIds= [];
    @Input() icon: string;
    @Input() inactiveIcon: string;
    @Input() inactiveTime: number= 180000;  // in ms (3 mins)
    @Input() labelMinZoom: number= 10;
    @Input() trackMinZoom: number= 10;
    @Input() mapZoom: number;
    @Input() showTrack: boolean= true;
    
    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes: SimpleChanges) { 
        if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
        if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
        if(changes.staleIds) { this.markStaleTargets( changes.staleIds.currentValue) } 
        if(changes.mapZoom) { this.handleZoom(changes.mapZoom) } 
        if(changes.showTrack) { this.updateTracks() }
        if(changes.inactiveTime) { this.updateFeatures() }
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
        this.updateTracks();
    }

    updateTargets(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            if(id.indexOf('aircraft')!=0) { return }
            let ais= this.aircraft.get(id);
            // ** aircraft **
            let f=layer.getFeatureById(id);
            if(f) { //update aircraft
                if(ais.position) {
                    f.setGeometry( new Point( fromLonLat(ais.position) ) );
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                }
                else { layer.removeFeature(f) }
            }
            else {  //create aircraft
                if(ais.position) {
                    f= new Feature( new Point( fromLonLat(ais.position) ) );
                    f.setId(id);
                    f.setStyle( new Style( this.setTargetStyle(id) ) );
                    layer.addFeature(f);
                }
            }   
            // ** ais track **
            let tk=layer.getFeatureById('track-'+ id);
            // ** handle dateline crossing **
            let tc= ais.track.map( mls=> {
                let lines= [];
                mls.forEach( line=> lines.push( GeoUtils.mapifyCoords(line) ) )
                return lines;
            });
            // **transform track coordinates**
            let tfc= tc.map( line=> { 
                let coords= [];
                line.forEach( i=> coords.push(fromLonLat(i)) );
                return coords;
            });
            if(tk) { // update track
                if(ais.position) { 
                    tk.getGeometry().setCoordinates( tfc );
                    tk.setStyle( new Style( this.setTrackStyle() ) );
                }
                else { layer.removeFeature(tk) }
            }
            else { // create track
                if(ais.position) {
                    tk= new Feature( new MultiLineString(tfc) );
                    tk.setId('track-'+ id);
                    tk.setStyle( new Style( this.setTrackStyle() ) );
                    layer.addFeature(tk);
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
            if(id.indexOf('aircraft')!=0) { return }
            let f=layer.getFeatureById(id);
            if(f) { layer.removeFeature(f) }
            f=layer.getFeatureById('track-'+ id);
            if(f) { layer.removeFeature(f) }
        });   
    }   

    // ** render the AIS features with updated styles
    updateFeatures() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            if(fid.slice(0,8)=='aircraft') { //aircraft features
                f.setStyle( new Style( this.setTargetStyle(fid.slice(4)) ) );
            }
        });
    }

    // ** return style to set for target id
    setTargetStyle(id: string) {
        if(!id) { return }
        let target= this.aircraft.get(id);
        let label= this.formatlabel( target.name || target.callsign || target.mmsi || '');
        let fstyle: any;
        // ** check if stale 
        let now= new Date().valueOf();
        let icon= (target.lastUpdated< (now-this.inactiveTime) ) ? this.inactiveIcon : this.icon;
        // ** show feature
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
        return fstyle;
    }  
    
    // ** render the track
    updateTracks() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            if(fid.slice(0,5)=='track') { //aircraft track
                f.setStyle( new Style( this.setTrackStyle() ) );
            }
        });        
    }

    // ** return style to set for track
    setTrackStyle() {
        let color: string;
        let rgb= '255, 0, 255';
        if(this.mapZoom<this.trackMinZoom) { color=`rgba(${rgb},0)` }
        else { color= (this.showTrack) ? `rgba(${rgb},1)` : `rgba(${rgb},0)` }

        return {                    
            stroke: new Stroke({
                width: 1,
                color: color,
                lineDash: [2,2]
            })
        };
    }  

}
