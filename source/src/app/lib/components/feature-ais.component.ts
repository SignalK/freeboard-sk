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
    @Input() icon;
    @Input() labelMinZoom;
    @Input() mapZoom;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';
    private layer;

    constructor(private host: SourceVectorComponent) { }

    ngOnInit() { }

    ngOnDestroy() { this.host.instance.clear(true) }

    ngOnChanges(changes) { if(changes.aisTargets) { this.processTargets() } }

    processTargets() {
        if(!this.host.instance) { return }
        let layer= this.host.instance;
        
        this.aisTargets.forEach( e=> {
            let aisText= (this.mapZoom<this.labelMinZoom) ? '' : 
                e[1].name || e[1].callsign || e[1].mmsi || ''; 
            let tc= proj.transform(
                e[1].position, 
                this.srid, 
                this.mrid
            );
            let f=layer.getFeatureById('ais-'+ e[0]);
            if(f) {
                f.setGeometry( new geom.Point(tc) );
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.icon,
                            rotateWithView: true,
                            rotation: e[1].cogTrue
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
                f.setId('ais-'+ e[0]);
                f.setStyle( 
                    new style.Style({
                        image: new style.Icon({
                            src: this.icon,
                            rotateWithView: true,
                            rotation: e[1].cogTrue
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

}
