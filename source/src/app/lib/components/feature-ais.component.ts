import { Component, OnInit, OnDestroy, OnChanges, Input } from '@angular/core';
import { geom, proj, style, Feature } from 'openlayers';
import { SourceVectorComponent } from 'ngx-openlayers';


@Component({
    selector: 'xol-ais-targets',
    template: `<ng-content></ng-content>`
})
export class AisTargetsComponent implements OnInit, OnDestroy, OnChanges {
    public componentType = 'feature';
    public instance: Feature;

    @Input() id: string|number|undefined;

    @Input() aisTargets;
    @Input() updateIds= [];
    @Input() staleIds= [];
    @Input() removeIds= [];
    @Input() icon;
    @Input() inactiveIcon;
    @Input() inactiveTime: number= 180000;  // in ms (3 mins)
    @Input() labelMinZoom;
    @Input() mapZoom;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';
    private layer;

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes) { 
        if(changes.updateIds) { this.updateTargets(changes.updateIds.currentValue) } 
        if(changes.removeIds) { this.removeTargets( changes.removeIds.currentValue) } 
        if(changes.staleIds) { this.markStaleTargets( changes.staleIds.currentValue) } 
        if(changes.mapZoom) { this.handleZoom(changes.mapZoom) } 
    }

    formatlabel(label) { return (this.mapZoom < this.labelMinZoom) ? '' : label }

    handleZoom(zoom) {
        if(!zoom.firstChange) {
            if( zoom.currentValue<this.labelMinZoom && 
                zoom.previousValue<this.labelMinZoom) { return }
            if( zoom.currentValue>=this.labelMinZoom && 
                zoom.previousValue>=this.labelMinZoom) { return }                
        }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        let now= new Date().valueOf();
        layer.forEachFeature(f=>{
            let ais= this.aisTargets.get( f.getId().toString().slice(4) );
            f.setStyle(
                new style.Style({
                    text: new style.Text({
                        text: this.formatlabel( ais.name || ais.callsign || ais.mmsi || ''),
                        offsetY: -12
                    }),
                    image: new style.Icon({
                        src: (ais.lastUpdated< (now-this.inactiveTime) ) ? this.inactiveIcon : this.icon,
                        rotateWithView: true,
                        rotation: ais.heading || ais.cogTrue
                    })
                })
            );     
        });
    }

    updateTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;

        ids.forEach( id=> {
            let ais= this.aisTargets.get(id);
            let aisText= this.formatlabel( ais.name || ais.callsign || ais.mmsi || ''); 
            let tc= proj.transform( ais.position, this.srid, this.mrid );
            let f=layer.getFeatureById('ais-'+ id);
            if(f) {
                f.setGeometry( new geom.Point(tc) );
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.icon,
                            rotateWithView: true,
                            rotation: ais.heading || ais.cogTrue
                        }),
                        text: new style.Text({
                            text: aisText,
                            offsetY: -12
                        })
                    })
                );
            }
            else {
                if(ais.position) {
                    f= new Feature( new geom.Point(tc) );
                    f.setId('ais-'+ id);
                    f.setStyle( 
                        new style.Style({
                            image: new style.Icon({
                                src: this.icon,
                                rotateWithView: true,
                                rotation: ais.heading || ais.cogTrue
                            }),
                            text: new style.Text({
                                text: aisText,
                                offsetY: -12
                            })
                        })
                    );
                    layer.addFeature(f);
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
            if(f) {
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.inactiveIcon,
                            rotateWithView: true,
                            rotation: ais.heading || ais.cogTrue
                        }),
                        text: new style.Text({
                            text: this.formatlabel( ais.name || ais.callsign || ais.mmsi || ''),
                            offsetY: -12
                        })
                    })
                );
            }                      
        });
    }    

    removeTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        ids.forEach( id=> { 
            let f=layer.getFeatureById('ais-'+ id);
            if(f) { layer.removeFeature(f) }
            this.aisTargets.delete(id);
        });   
    }

}
