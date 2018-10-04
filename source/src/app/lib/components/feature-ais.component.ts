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
    @Input() icon;
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
        if(changes.staleIds) { this.removeStaleIds( changes.staleIds.currentValue) } 
    }

    updateTargets(ids) {
        if( !ids || !Array.isArray(ids) ) { return }        
        if(!this.host.instance) { return }
        let layer= this.host.instance;

        ids.forEach( id=> {
            let ais= this.aisTargets.get(id);
            let aisText= (this.mapZoom<this.labelMinZoom) ? '' : 
                ais.name || ais.callsign || ais.mmsi || ''; 
            let tc= proj.transform( ais.position, this.srid, this.mrid );

            let f=layer.getFeatureById('ais-'+ id);
            if(f) {
                f.setGeometry( new geom.Point(tc) );
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.icon,
                            rotateWithView: true,
                            rotation: ais.cogTrue
                        }),
                        text: new style.Text({
                            text: aisText,
                            offsetY: -12
                        })
                    })
                );
            }
            else {
                f= new Feature( new geom.Point(tc) );
                f.setId('ais-'+ id);
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.icon,
                            rotateWithView: true,
                            rotation: ais.cogTrue
                        }),
                        text: new style.Text({
                            text: aisText,
                            offsetY: -12
                        })
                    })
                );
                layer.addFeature(f);
            }                        
        });
    }

    removeStaleIds(ids) {
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
