import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy } from '@angular/core';
import { geom, proj, Sphere } from 'openlayers';
import { FeatureComponent } from 'ngx-openlayers';



@Component({
    selector: 'xol-geometry-circle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ng-content></ng-content>`
})
export class GeometryCircleComponent implements OnInit, OnDestroy {
    public componentType: string = 'geometry-circle';
    public instance: geom.Circle;
    @Input() radius: number= 10;
    @Input() center;

    private mrid= 'EPSG:3857';
    private srid= 'EPSG:4326';


    constructor(private host: FeatureComponent) { }

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

    ngOnDestroy() { }

    ngOnChanges(changes) {
        let ctr;
        let rad;

        if(this.instance && changes.center && typeof changes.center.currentValue!='undefined') {
            ctr= proj.transform(
                changes.center.currentValue, 
                this.srid, 
                this.mrid
            );            
        }
        else { ctr= this.center }
        if(this.instance && changes.radius && typeof changes.radius.currentValue!='undefined') {
            rad= changes.radius.currentValue;
        }  
        else { rad= this.radius } 

        if(!this.instance) { return }
        // ** draw circle on map surface using ground radius of sphere
        let edgeCoordinate = this.instance.getCenter();
        edgeCoordinate[0]= edgeCoordinate[0] + this.radius;
        let wgs84Sphere = new Sphere(6378137);
        let grad= wgs84Sphere.haversineDistance(
            proj.transform(ctr, this.mrid, this.srid), 
            proj.transform(edgeCoordinate, this.mrid, this.srid)
        );
        this.instance.setCenterAndRadius(ctr, rad + (rad-grad) );
    }
}
