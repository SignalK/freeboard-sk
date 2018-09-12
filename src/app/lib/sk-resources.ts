import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { MatCheckboxModule, MatCardModule, MatButtonModule,
        MatIconModule, MatTooltipModule, MatSliderModule, MatSlideToggleModule } from '@angular/material';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from '../app.info';

import { RouteListComponent } from  './components/routelist'
import { WaypointListComponent } from  './components/waypointlist'
import { ChartListComponent } from  './components/chartlist'
import { AnchorWatchComponent } from  './components/anchorwatch'

import { GeoUtils } from  './geoutils'
declare var UUIDjs: any;

@NgModule({
    imports: [
        CommonModule, HttpClientModule,
        MatCheckboxModule, MatCardModule,
        MatButtonModule, MatIconModule, MatTooltipModule, 
        MatSliderModule, MatSlideToggleModule
    ],
    declarations: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent
    ],
    exports: [
        RouteListComponent, WaypointListComponent, ChartListComponent,
        AnchorWatchComponent
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
        
        this.signalk.apiGet('/resources/charts')
        .subscribe( 
            res=> {              
                let r= Object.entries(res);
                this.app.data.charts= baseCharts.slice(0);
                r.forEach( i=> {
                    this.app.data.charts.push([ 
                        i[0], 
                        new SKChart(i[1]),
                        (this.app.config.selections.charts.indexOf(i[0])==-1) ? false : true 
                    ]);
                });
            // ** clean up selections
            let k= Object.keys(res);
            this.app.config.selections.charts= this.app.config.selections.charts.map( i=> {
                return k.indexOf(i)!=-1 ? i : null;
            }).filter(i=> { return i});                  
            },
            err=> { this.app.data.charts= baseCharts.slice(0) }
        )
    }    

    // ** get routes from sk server
    getRoutes() {
        this.signalk.apiGet('vessels/self/navigation/course/activeRoute')
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
        this.signalk.apiGet('/resources/routes')
        .subscribe( res=> {               
            let r= Object.entries(res);
            this.app.data.routes= [];
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
    buildRoute(coordinates) {
        let rte= new SKRoute();
        let wStart= new SKWaypoint();
        let wEnd= new SKWaypoint();

        let rteUuid= new UUIDjs._create4().hex;  
        let wStartUuid= new UUIDjs._create4().hex;  
        let wEndUuid= new UUIDjs._create4().hex; 

        rteUuid= `urn:mrn:signalk:uuid:${rteUuid}`;
        rte.feature.geometry.coordinates= coordinates;
        for(let i=0;i<coordinates.length-1;++i) { 
            rte.distance+= GeoUtils.distanceTo(coordinates[i], coordinates[i+1]);
        }
        rte.start= `urn:mrn:signalk:uuid:${wStartUuid}`;
        rte.end= `urn:mrn:signalk:uuid:${wEndUuid}`;  

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

    // ** get waypoints from sk server
    getWaypoints() {
        this.signalk.apiGet('/resources/waypoints')
        .subscribe( 
            res=> { 
                let r= Object.entries(res);
                this.app.data.waypoints= [];
                r.forEach( i=> {
                    if(!i[1].feature.properties.name) { 
                        i[1].feature.properties.name='Xpt-' + i[0].slice(-6);
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
    type: string;

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
            this.type= (chart.type) ? chart.type : null;
        }
    }
}

