import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from '../../app.info';
import { GeoUtils, GeoHash } from  '../geoutils'

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
                    r.sort( (a,b)=> { return (b[1]['name'] < a[1]['name']) ? 1 : -1 });
                    r.forEach( i=> {
                        if(i[1]['tilemapUrl'][0]=='/' || i[1]['tilemapUrl'].slice(0,4)!='http') { // ** ensure host is in url
                            i[1]['tilemapUrl']= this.app.host + i[1]['tilemapUrl'];
                        }
                        if(!i[1]['scale']) { i[1]['scale']= 250000 }
                        i[1]['name']= (i[1]['identifier'] && i[1]['identifier']!=i[1]['name']) ? 
                             i[1]['identifier'] + ' - ' + i[1]['name'] : i[1]['name'];
                        
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
                    if(!i[1]['feature'].properties.name) { 
                        i[1]['feature'].properties.name='Wpt-' + i[0].slice(-6);
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

    // get regions from server
    getRegions(params:string=null) { 
        let rf= (params && params[0]!='?') ? `?${params}` : ''
        return this.signalk.api.get(`/resources/regions${rf}`);
    }

    // ** get notes / regions from sk server
    getNotes(params:string=null) {
        let resRegions= this.getRegions(params).pipe( catchError(error => of(error)) );

        let rf= (params) ? params : this.app.config.resources.notes.rootFilter;
        rf= this.processTokens(rf);
        if(rf && rf[0]!='?') { rf='?' + rf }
        let resNotes= this.signalk.api.get(`/resources/notes${rf}`);
        let res= forkJoin(resRegions, resNotes);
        res.subscribe(
            res=> { 
                if(typeof res[0]['error']==='undefined') { 
                    let r= Object.entries(res[0]);
                    this.app.data.regions= []; 
                    r.forEach( i=> { this.app.data.regions.push([i[0], new SKRegion(i[1]), false]) });
                }   
                this.processNotes(res[1]);
            }
        )
    } 

    private processNotes(n:any) {
        let r= Object.entries(n);
        this.app.data.notes= [];
        // ** set an upper limit of records to process **
        if(r.length>300) { r= r.slice(0,299) }
        r.forEach( i=> {
            if(!i[1]['title']) { 
                i[1]['feature'].properties.title='Note-' + i[0].slice(-6);
            }
            if(typeof i[1]['position']=='undefined') {
                if(typeof i[1]['geohash']!=='undefined') {  // get center of geohash
                    let gh= new GeoHash()
                    let p= gh.center( i[1]['geohash'] );
                    i[1]['position']= {latitude:p[1], longitude:p[0]} 
                    let b= gh.decode( i[1]['geohash'] );
                    i[1]['boundary']= [
                        b.ne, [ b.ne[0], b.sw[1] ], b.sw, [ b.sw[0], b.ne[1] ], b.ne
                    ];
                }
                else if(typeof i[1]['region']!=='undefined') { // get center of region 
                    let ra= this.app.data.regions.filter( j=> { 
                        if(j[0]==i[1]['region']) { return true }
                    });
                    if(ra.length!=0) {
                        let r= ra[0][1];
                        let c= GeoUtils.centreOfPolygon(r.feature.geometry.coordinates[0]);
                        i[1]['position']= {latitude: c[1], longitude: c[0]};
                        i[1]['boundary']= r.feature.geometry.coordinates[0];
                    }
                }            
            }
            if( typeof i[1]['position']!== 'undefined') { 
                this.app.data.notes.push([ i[0], new SKNote(i[1]), true ]);
            }
        });
    }

    // ** process url tokens
    processTokens(s:string):string {
        if(!s) { return s }
        let ts= s.split('%');
        if(ts.length>1) {
            let uts= ts.map( i=>{
                if(i=='map:latitude') { return this.app.config.map.center[1] }
                else if(i=='map:longitude') { return this.app.config.map.center[0] }
                else { return i }
            });
            s= uts.join('');
        }
        return s;
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
    heading: number;
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

// ** Signal K Note
export class SKNote {
    title: string;
    description: string;
    region: string;
    geohash: string;   
    mimeType: string;
    url: string; 
    position: any;

    constructor(note?) {
        if(note) {
            if(note.title) { this.title= note.title }
            if(note.description) { this.description= note.description }
            if(note.region) { this.region= note.region }
            if(note.geohash) { this.geohash= note.geohash }
            if(note.mimeType) { this.mimeType= note.mimeType }
            if(note.url) { this.url= note.url }
            if(note.position) { this.position= note.position }
        }
    }    
} 

// ** Signal K Region
export class SKRegion {
    geohash: string;   
    feature= {          
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: []
        },
        properties: {},
        id: ''
    };

    constructor(region?) {
        if(region) {
            if(region.geohash) { this.geohash= region.geohash }
            if(region.feature) { this.feature= region.feature }
        }
    }     
}