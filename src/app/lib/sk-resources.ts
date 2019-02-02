import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { MatCheckboxModule, MatCardModule, MatButtonModule, MatListModule, 
        MatFormFieldModule, MatInputModule,
        MatIconModule, MatTooltipModule, MatSliderModule, MatSlideToggleModule } from '@angular/material';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from '../app.info';

import { RouteListComponent } from  './components/routelist'
import { WaypointListComponent } from  './components/waypointlist'
import { ChartListComponent } from  './components/chartlist'
import { AISListComponent } from  './components/aislist'
import { AnchorWatchComponent } from  './components/anchorwatch'

import { GeoUtils } from  './geoutils'

@NgModule({
    imports: [
        CommonModule, HttpClientModule,
        MatCheckboxModule, MatCardModule, MatListModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule, 
        MatFormFieldModule, MatInputModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent, AISListComponent
    ]
})
export class SignalKModule { }

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResources {

    constructor(http: HttpClient, public signalk: SignalKClient, public app: AppInfo) { }

    // ** get charts from sk server
    getCharts() {
        let baseCharts= [
            ['openstreetmap', {
                name: 'World Map',
                description: 'Open Street Map',
                tilemapUrl: null,
                chartUrl: null
            }, true],
            ['openseamap', {
                name: 'Sea Map',
                description: 'Open Sea Map',
                tilemapUrl: null,
                chartUrl: null
            }, true]
        ];

        baseCharts.forEach(i=> {
            i[2]= (this.app.config.selections.charts.indexOf(i[0])==-1) ? false : true;            
        })
        
        this.signalk.api.get('/resources/charts')
        .subscribe( 
            res=> { 
                this.app.data.charts= baseCharts.slice(0); 
                let r= Object.entries(res);
                if(r.length>0) {   
                    // ** sort by name **
                    r.sort( (a,b)=> { return (b[1].name < a[1].name) ? 1 : -1 });
                    r.forEach( i=> {
                        if(i[1].tilemapUrl[0]=='/' || i[1].tilemapUrl.slice(0,4)!='http') { // ** ensure host is in url
                            i[1].tilemapUrl= this.app.host + i[1].tilemapUrl;
                        }
                        if(!i[1].scale) { i[1].scale= 250000 }
                        i[1].name= (i[1].identifier && i[1].identifier!=i[1].name) ? 
                             i[1].identifier + ' - ' + i[1].name : i[1].name;
                        
                        this.app.data.charts.push([ 
                            i[0], 
                            new SKChart(i[1]),
                            (this.app.config.selections.charts.indexOf(i[0])==-1) ? false : true 
                        ]);
                    });
                    // ** clean up selections
                    this.app.config.selections.charts= this.app.data.charts.map( 
                        i=>{ return (i[2]) ? i[0] : null }
                    ).filter(i=> { return i});
                }               
            },
            err=> { this.app.data.charts= baseCharts.slice(0) }
        )
    }    

    // ** get routes from sk server
    getRoutes() {
        this.signalk.api.get('vessels/self/navigation/courseGreatCircle/activeRoute')
        .subscribe( 
            r=> {
                if(r['href'] && r['href'].value) {
                    let a= r['href'].value.split('/');
                    this.app.data.activeRoute= a[a.length-1];
                }  
                this.retrieveRoutes();      
            },
            e=> { this.retrieveRoutes() }
        );  

    }

    private retrieveRoutes() {
        this.signalk.api.get('/resources/routes')
        .subscribe( res=> {  
            this.app.data.routes= [];
            if(!res) { return }   

            let r= Object.entries(res);
            r.forEach( i=> {
                this.app.data.routes.push([ 
                    i[0], 
                    new SKRoute(i[1]), 
                    (this.app.config.selections.routes.indexOf(i[0])==-1) ? false : true,
                    (i[0]==this.app.data.activeRoute) ? true : false
                ]);
            });
            // ** clean up selections
            let k= Object.keys(res);
            this.app.config.selections.routes= this.app.config.selections.routes.map( i=> {
                return k.indexOf(i)!=-1 ? i : null;
            }).filter(i=> { return i});            
        });
    }

    // ** build and return object containing: SKRoute,  start & end SKWaypoint objects from supplied coordinates
    buildRoute(coordinates):any {
        let rte= new SKRoute();
        let wStart= new SKWaypoint();
        let wEnd= new SKWaypoint();

        let rteUuid= this.signalk.uuid.toSignalK();  
        let wStartUuid= this.signalk.uuid.toSignalK();  
        let wEndUuid= this.signalk.uuid.toSignalK(); 

        rte.feature.geometry.coordinates= coordinates;
        for(let i=0;i<coordinates.length-1;++i) { 
            rte.distance+= GeoUtils.distanceTo(coordinates[i], coordinates[i+1]);
        }
        rte.start= wStartUuid;
        rte.end= wEndUuid;  

        wStart.feature.geometry.coordinates= rte.feature.geometry.coordinates[0];
        wStart.position= { 
            latitude: wStart.feature.geometry.coordinates[1],
            longitude: wStart.feature.geometry.coordinates[0]
        }
        let l= rte.feature.geometry.coordinates.length;
        wEnd.feature.geometry.coordinates= rte.feature.geometry.coordinates[l-1];
        wEnd.position= { 
            latitude: wEnd.feature.geometry.coordinates[1],
            longitude: wEnd.feature.geometry.coordinates[0]
        }        
        return {
            route: [rteUuid, rte],
            wptStart: [rte.start, wStart],
            wptEnd: [rte.end, wEnd]
        }
    }

    // ** build and return SKWaypoint object with supplied coordinates
    buildWaypoint(coordinates):any {
        let wpt= new SKWaypoint();
        let wptUuid= this.signalk.uuid.toSignalK();  

        wpt.feature.geometry.coordinates= coordinates;
        wpt.position= { 
            latitude: coordinates[1],
            longitude: coordinates[0]
        }        
        return [wptUuid, wpt];
    }    

    // ** get waypoints from sk server
    getWaypoints() {
        this.signalk.api.get('/resources/waypoints')
        .subscribe( 
            res=> { 
                this.app.data.waypoints= [];
                if(!res) { return }                   
                let r= Object.entries(res);

                r.forEach( i=> {
                    if(!i[1].feature.properties.name) { 
                        i[1].feature.properties.name='Wpt-' + i[0].slice(-6);
                    }
                    this.app.data.waypoints.push([ 
                        i[0], 
                        new SKWaypoint(i[1]), 
                        (this.app.config.selections.waypoints.indexOf(i[0])==-1) ? false : true  
                    ]);
                });
                // ** clean up selections
                let k= Object.keys(res);
                this.app.config.selections.waypoints= this.app.config.selections.waypoints.map( i=> {
                    return k.indexOf(i)!=-1 ? i : null;
                }).filter(i=> { return i});
            },
            err=> {}
        )
    }       

}

// ** Signal K route
export class SKRoute {
    name: string;
    description: string;
    distance: number= 0;
    start: string;
    end: string;
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [ [0,0], [0,0] ]
        },
        properties: {},
        id: ''
    };

    constructor(route?) {
        if(route) {
            this.name= (route.name) ? route.name : null;
            this.description= (route.description) ? route.description : null;
            this.distance= (route.distance) ? route.distance : null;
            this.start= (route.start) ? route.start : null;
            this.end= (route.end) ? route.end : null;
            this.feature= (route.feature) ? route.feature : null;
        }
    }
}

// ** Signal K waypoint
export class SKWaypoint {
    position= {latitude: 0, longitude: 0};
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        },
        properties: {},
        id: ''
    };

    constructor(wpt?) {
        if(wpt) {
            if(wpt.position) { this.position= wpt.position }
            if(wpt.feature) { this.feature= wpt.feature }
        }
    }
} 

// ** Signal K chart
export class SKChart {
    name: string;
    description: string;
    identifier: number;
    tilemapUrl: string;
    region: string;
    geohash: any;
    chartUrl: string;
    scale: number;
    chartLayers: Array<any>;
    bounds: Array<any>;
    chartFormat: string;

    constructor(chart?) {
        if(chart) {
            this.name= (chart.name) ? chart.name : null;
            this.description= (chart.description) ? chart.description : null;
            this.identifier= (chart.identifier) ? chart.identifier : null;
            this.tilemapUrl= (chart.tilemapUrl) ? chart.tilemapUrl : null;
            this.region= (chart.region) ? chart.region : null;
            this.geohash= (chart.geohash) ? chart.geohash : null;
            this.chartUrl= (chart.chartUrl) ? chart.chartUrl : null;
            this.scale= (chart.scale) ? chart.scale : null;
            this.chartLayers= (chart.chartLayers) ? chart.chartLayers : null;
            this.bounds= (chart.bounds) ? chart.bounds : null;
            this.chartFormat= (chart.chartFormat) ? chart.chartFormat : null;
        }
    }
}

// ** Vessel Data **
export class SKVessel {
    id: string;
    position= [0,0];
    heading: number= 0;
    headingTrue: number= 0;
    headingMagnetic: number= 0;
    cog: number;
    cogTrue: number= null;
    cogMagnetic: number= null;
    sog: number;
    name: string;
    mmsi: string;
    callsign: string; 
    state: string;   
    wind= { direction: null, mwd: null, twd: null, tws: null, awa: null, aws: null };
    lastUpdated= new Date();
}

