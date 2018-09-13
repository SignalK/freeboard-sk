import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { geom, proj } from 'openlayers';
import { FeatureComponent } from 'ngx-openlayers';



@Component({
    selector: 'xol-geometry-circle',
    template: `<ng-content></ng-content>`
})
export class GeometryCircleComponent implements OnInit, OnDestroy {
    public componentType: string = 'geometry-circle';
    public instance: geom.Circle;
    @Input() radius: number= 10;
    @Input() center;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';


    constructor(private host: FeatureComponent) {
        console.log('creating aol-geometry-circle');
    }

    ngOnInit() {
        let ctr= this.center ? this.center : [0,0];
        let rad= this.radius || 0;
        let tc= proj.transform(
            ctr, 
            this.srid, 
            this.mrid
        );
        this.instance = new geom.Circle(tc, rad); // defaulting coordinates to [0,0] and radius=0. To be overridden in child component.
        this.host.instance.setGeometry(this.instance);
    }

    ngOnDestroy() {
    // this.host.setGeometry(null);
    }

    ngOnChanges(changes) {
        if(this.instance && changes.center && typeof changes.center.currentValue!='undefined') {
            let tc= proj.transform(
                changes.center.currentValue, 
                this.srid, 
                this.mrid
            );            
            this.instance.setCenter(tc);
        }
        if(this.instance && changes.radius && typeof changes.radius.currentValue!='undefined') {
            this.instance.setRadius(changes.radius.currentValue);
        }        
        
    }
}
