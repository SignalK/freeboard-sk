import { Component, OnInit, OnDestroy, OnChanges, Input, ChangeDetectionStrategy, 
        SimpleChange, SimpleChanges } from '@angular/core';
import { GeoUtils } from 'src/app/lib/geoutils';

import { Point, LineString, MultiLineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Style, Stroke, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { SourceVectorComponent } from 'ngx-openlayers';


@Component({
    selector: 'xol-tracks',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class TracksComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() tracks: any;
    @Input() updateIds= [];
    @Input() removeIds= [];
    @Input() minZoom: number= 10;
    @Input() mapZoom: number;
    @Input() showTracks: boolean= true;
    
    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes: SimpleChanges) { 
        if(changes.removeIds) { this.removeFeatures( changes.removeIds.currentValue) } 
        if(changes.updateIds) { this.updateFeatures(changes.updateIds.currentValue) } 
        if(changes.mapZoom) { this.handleZoom(changes.mapZoom) }
        if(changes.minZoom || changes.showTracks) { this.updateFeatureStyle() }
    }

    handleZoom(zoom: SimpleChange) {
        let doFeatureUpdate: boolean= true;
        if(!zoom.firstChange) {
            if( (zoom.currentValue<this.minZoom && zoom.previousValue<this.minZoom) || 
                ( zoom.currentValue>=this.minZoom && zoom.previousValue>=this.minZoom) ) { 
                    doFeatureUpdate=false;
            }                                     
        }
        if( doFeatureUpdate) { this.updateFeatureStyle() }
    }

    updateFeatures(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> {
            let trk= this.tracks.get(id);
            if(!trk) { return }
            // ** target track **
            let tkf=layer.getFeatureById('track-'+ id);
            let tfc= this.parseCoordinates(trk);

            if(tkf) { // update track
                tkf.getGeometry().setCoordinates( tfc );
                tkf.setStyle( new Style( this.calcStyle(id) ) );
            }
            else { // create track
                tkf= new Feature( new MultiLineString(tfc) );
                tkf.setId('track-'+ id);
                tkf.setStyle( new Style( this.calcStyle(id) ) );
                layer.addFeature(tkf);
            }                               
        });
    }   

    removeFeatures(ids:Array<string>) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            let f=layer.getFeatureById('track-'+ id);
            if(f) { layer.removeFeature(f) }
        });   
    }
    
    // ** re-render the track style
    updateFeatureStyle() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        layer.forEachFeature( f=> {
            let fid= f.getId().toString();
            f.setStyle( new Style( this.calcStyle(fid) ) );
        });        
    }

    // ** return style to set for track
    calcStyle(id:string) {
        let rgb= (id.indexOf('aircraft')!=-1) ?  '0, 0, 255' : '255, 0, 255';
        let color= (this.mapZoom < this.minZoom) ? `rgba(${rgb},0)` : `rgba(${rgb},1)`;
        color= (this.showTracks) ? `rgba(${rgb},1)` : `rgba(${rgb},0)`;
        return {                    
            stroke: new Stroke({
                width: 1,
                color: color,
                lineDash: [2,2]
            })
        };
    }  

    // ** parse and transform coordinates
    parseCoordinates(trk:Array<any>) {
        // ** handle dateline crossing **
        let tc= trk.map( mls=> {
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
        return tfc;
    }

}
