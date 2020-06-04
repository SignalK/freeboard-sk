import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from 'src/app/app.info';
import { GeoUtils, GeoHash } from  'src/app/lib/geoutils'

import { LoginDialog } from 'src/app/lib/app-ui';
import { NoteDialog, RegionDialog } from './notes'
import { ResourceDialog } from './resource-dialogs'
import { SKChart, SKRoute, SKWaypoint, SKRegion, SKNote } from './resource-classes'
import { GRIB_PATH, Grib } from 'src/app/lib/grib'
import { moveItemInArray } from '@angular/cdk/drag-drop';

interface IActiveRoute {
    action: string;
    value: any;
}

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResources {

    private reOpen: {key: any, value: any };

    private updateSource: Subject<any>= new Subject<any>();  
    private activeRouteSource: Subject<IActiveRoute>= new Subject<IActiveRoute>(); 

    constructor( public dialog: MatDialog,
        public signalk: SignalKClient, 
        public app: AppInfo) { }

    // ** Observables **
    public update$(): Observable<any> { return this.updateSource.asObservable() }; 
    public activeRoute$(): Observable<IActiveRoute> { return this.activeRouteSource.asObservable() }; 

    // ** UI methods **
    routeSelected(e:any) {
        let t= this.app.data.routes.map(
            i=> { if(i[2]) { return i[0] }  }
        );
        this.app.config.selections.routes= t.filter(
            i=> { return (i) ? true : false }
        );      
        this.app.saveConfig();
        this.updateSource.next({action: 'selected', mode: 'route'});  
    }    

    waypointSelected(e:any) {
        let t= this.app.data.waypoints.map( i=> { if(i[2]) { return i[0] }  });
        this.app.config.selections.waypoints= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
        this.updateSource.next({action: 'selected', mode: 'waypoint'});  
    }     

    noteSelected(e:any) {
        if(e.isGroup) { this.showRelatedNotes(e.id, 'group') }
        else { this.showNoteInfo({id: e.id}) }
        this.updateSource.next({action: 'selected', mode: 'note'});  
    }

    aisSelected(e:any) {
        this.app.config.selections.aisTargets= e;
        this.app.saveConfig();
        this.updateSource.next({action: 'selected', mode: 'ais'});  
    } 

    chartSelected(e:any) {
        if(!e) { return }
        let t= this.app.data.charts.map(
            i=> { if(i[2]) { return i[0] } }
        );
        this.app.config.selections.charts= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
        this.updateSource.next({action: 'selected', mode: 'chart'});  
    }
    
    // ** Set waypoint as nextPoint **
    navigateToWaypoint(e:any) { 
        let wpt= this.app.data.waypoints.map( i=>{ if(i[0]==e.id) {return i} } ).filter(i=> {return i});
        this.app.data.activeWaypoint= e.id;
        this.clearActiveRoute(null,true);
        this.setNextPoint(wpt[0][1].position);
    }    

    // ** handle display resource properties **
    resourceProperties(r:any) {
        switch(r.type) {
            case 'waypoint': 
                this.showWaypointEditor(r);
                break;
            case 'route': 
                this.showRouteInfo(r);
                break; 
            case 'note':
                this.showNoteInfo(r);
                break;               
            case 'region':
                this.showRelatedNotes(r.id);
                break;                   
        }
    }  

    // **** GRIB ****

    // ** get list of GRIB resources **
    getGRIBList() { return this.signalk.api.get(GRIB_PATH) }

    // ** get GRIB entry (entry=null: clear GRIB data)
    getGRIBData(entry:string=null) { 
        if(!entry) { // clear values
            this.app.data.grib.values.wind= [];
            this.app.data.grib.values.temperature= [];
            this.updateSource.next({action: 'get', mode: 'grib'});
        }
        else { 
            this.signalk.api.get(`${GRIB_PATH}/${entry}`).subscribe(
                (r:any)=> { 
                    this.app.data.grib.values.wind= Grib.parseGRIBWind(r);
                    this.app.data.grib.values.temperature= Grib.parseGRIBTemperature(r, 'C');
                    this.updateSource.next({action: 'get', mode: 'grib'});
                },
                err=> { console.warn(err) }
            );
        }
    }


    // **** CHARTS ****

    private OSMCharts= [
        [
            'openstreetmap',
            new SKChart({
                name: 'World Map',
                description: 'Open Street Map'
            }),
            true
        ],        
        [
            'openseamap', 
            new SKChart({
                name: 'Sea Map',
                description: 'Open Sea Map',
                tilemapUrl: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
                minzoom: 12,
                maxzoom: 18,
                bounds: [-180, -90, 180, 90]
            }), 
            true
        ],     
    ];

    // ** get charts from sk server
    getCharts() {
        // ** fetch charts from server
        this.signalk.api.get('/resources/charts')
        .subscribe( 
            res=> { 
                this.app.data.charts= [];
                // add OSeaMap
                this.OSMCharts[1][2]= (this.app.config.selections.charts.includes('openseamap')) ? true : false;
                this.app.data.charts.push(this.OSMCharts[1]); 

                let r= Object.entries(res);
                if(r.length>0) {   
                    // ** process attributes
                    r.forEach( i=> {
                        // ** ensure host is in url
                        if(i[1]['tilemapUrl'][0]=='/' || i[1]['tilemapUrl'].slice(0,4)!='http') {
                            i[1]['tilemapUrl']= this.app.host + i[1]['tilemapUrl'];
                        }
                        this.app.data.charts.push([ 
                            i[0], 
                            new SKChart(i[1]),
                            (this.app.config.selections.charts.includes(i[0])) ? true : false 
                        ]);
                    });
                    // ** sort by scale
                    this.sortByScaleDesc();

                    // insert OStreetM at start of list
                    this.OSMCharts[0][2]= (this.app.config.selections.charts.includes('openstreetmap')) ? true : false;
                    this.app.data.charts.unshift(this.OSMCharts[0]);

                    // ** clean up selections
                    this.app.config.selections.charts= this.app.data.charts.map( 
                        i=>{ return (i[2]) ? i[0] : null }
                    ).filter(i=> { return i });
                    
                    // arrange the chart layers
                    this.arrangeChartLayers();

                    // emit update
                    this.updateSource.next({action: 'get', mode: 'chart'});
                }               
            },
            err=> { this.app.data.charts= this.OSMCharts.slice(0) }
        )
    }
    
    // ** sort charts by scale descending .
    private sortByScaleDesc() {
        this.app.data.charts.sort( 
            (a,b)=> { return (b[1].scale - a[1].scale) } 
        );
    }

    // ** arrange charts by layer order.
    public arrangeChartLayers() {
        let chartOrder= this.app.config.selections.chartOrder;
        if(chartOrder && Array.isArray(chartOrder) && chartOrder.length!=0) {
            for(let destidx=0; destidx<chartOrder.length; destidx++) {
                let srcidx: number= -1;
                let idx: number= 0;
                this.app.data.charts.forEach( c=>{
                    if(c[0]== chartOrder[destidx]) { srcidx= idx }
                    idx++;
                });
                if(srcidx!=-1) {
                    moveItemInArray(this.app.data.charts, srcidx, destidx+1);
                }
            }   
        }
    }      


    // **** ROUTES ****

    // ** get routes from sk server
    getRoutes(activeId?:string) {
        let context= (activeId) ? activeId.split('.').join('/') : 'vessels/self';
        this.signalk.api.get(`${context}/navigation/courseGreatCircle/activeRoute`)
        .subscribe( 
            r=> {
                if(r['href'] && r['href'].value) {
                    let a= r['href'].value.split('/');
                    this.app.data.activeRoute= a[a.length-1];
                } 
                else { this.app.data.activeRoute=null } 
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
                    (this.app.config.selections.routes.indexOf(i[0])==-1) ? false : true
                ]);
                if(i[0]==this.app.data.activeRoute) { 
                    this.app.data.navData.pointTotal= i[1].feature.geometry.coordinates.length;
                }
            });
            // ** clean up selections
            let k= Object.keys(res);
            this.app.config.selections.routes= this.app.config.selections.routes.map( i=> {
                return k.indexOf(i)!=-1 ? i : null;
            }).filter(i=> { return i});   
            this.updateSource.next({action: 'get', mode: 'route'});         
        });
    }

    // ** build and return object containing: SKRoute
    buildRoute(coordinates):any {
        let rte= new SKRoute();
        let rteUuid= this.signalk.uuid.toSignalK();
        rte.feature.geometry.coordinates= GeoUtils.normaliseCoords(coordinates);
        for(let i=0;i<coordinates.length-1;++i) { 
            rte.distance+= GeoUtils.distanceTo(coordinates[i], coordinates[i+1]);
        }
        rte.start= null;
        rte.end= null;
        return [rteUuid, rte]
    }

    // ** create route on server **
    private createRoute(rte:any) {
        this.signalk.api.put(`/resources/routes/${rte[0]}`, rte[1]).subscribe( 
            res=> { 
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not add Route!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not add Route!');
                        } 
                        else { 
                            this.app.config.selections.routes.push(rte[0]);
                            this.app.saveConfig();
                            this.getRoutes();  
                        }      
                    });
                } 
                else if(res['statusCode']==200) { // complete
                    this.app.config.selections.routes.push(rte[0]);
                    this.app.saveConfig();
                    this.getRoutes();                        
                }                
            },
            err=> {
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.createRoute(rte);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }
                else { this.app.showAlert('ERROR:', 'Server could not add Route!') }
            }
        );
    }

    // ** update route on server **
    private updateRoute(id:string, rte:any) {
        this.signalk.api.put(`/resources/routes/${id}`, rte)
        .subscribe( 
            res=> { 
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not update Route!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not update Route!');
                        } 
                        else { this.getRoutes() }      
                    });
                } 
                else if(res['statusCode']==200) { this.getRoutes() }
            },
            err=> { 
                this.getRoutes();
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.updateRoute(id, rte);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                } 
                else { this.app.showAlert('ERROR:', 'Server could not update Route details!') }
            }
        );
    }    

    // ** delete route on server **
    private deleteRoute(id:string) {
        this.signalk.api.delete(`/resources/routes/${id}`)
        .subscribe( 
            res=> {  
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not delete Route!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not delete Route!');
                        } 
                        else { this.getRoutes() }      
                    });
                } 
                else if(res['statusCode']==200) { this.getRoutes() }
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.deleteRoute(id);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                } 
                else { this.app.showAlert('ERROR:', 'Server could not delete Route!') }
            }
        );  
    }   

    // ** modify Route point coordinates **
    updateRouteCoords(id:string, coords:Array<[number,number]>) {
        let t= this.app.data.routes.filter( i=>{ if(i[0]==id) return true });
        if(t.length==0) { return }
        let rte=t[0][1];
        rte['feature']['geometry']['coordinates']= GeoUtils.normaliseCoords(coords);
        this.updateRoute(id, rte);
    }

    // ** return array of route coordinates **
    getActiveRouteCoords(routeId?:string) {
        if(!routeId) { routeId= this.app.data.activeRoute }
        let rte= this.app.data.routes.filter( r=> { if(r[0]==routeId) { return r } } );
        if(rte.length==0) { return [] }
        else { return rte[0][1].feature.geometry.coordinates }
    }

    // ** Display Edit Route properties Dialog **
    showRouteInfo(e:any) {
        let t= this.app.data.routes.filter( i=>{ if(i[0]==e.id) return true });
        if(t.length==0) { return }
        let rte=t[0][1];
        let resId= t[0][0];

        this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: 'Route Details:',
                name: (rte['name']) ? rte['name'] : null,
                comment: (rte['description']) ? rte['description'] : null,
                type: 'route'
            }
        }).afterClosed().subscribe( r=> {
            if(r.result) { // ** save / update route **
                rte['description']= r.data.comment;
                rte['name']= r.data.name;
                this.updateRoute(resId, rte);
            }
        });
    }

    // ** Display New Route properties Dialog **
    showRouteNew(e:any) {
        if(!e.coordinates) { return }    
        let res= this.buildRoute(e.coordinates);
        
        this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: 'New Route:',
                name: null,
                comment: null,
                type: 'route',
                addMode: true
            }
        }).afterClosed().subscribe( r=> {
            if(r.result) { // ** create route **
                res[1]['description']= r.data.comment || '';
                res[1]['name']= r.data.name;
                this.createRoute(res);
            }
        });
    }

    // ** Confirm Route Deletion **
    showRouteDelete(e:any) { 
        this.app.showConfirm(
                'Do you want to delete this Route?\n \nRoute will be removed from the server (if configured to permit this operation).',
                'Delete Route:',
                'YES',
                'NO'
        ).subscribe( ok=> { if(ok) { this.deleteRoute(e.id) } });          
    }    

    // ** set activeRoute.href, startTime and nextPoint.position **
    activateRoute(id:string, activeId?:string, startPoint?:{latitude:number,longitude:number}) { 
        let context= (activeId) ? activeId : 'self';
        let dt= new Date();    
        
        let t= this.app.data.routes.filter( i=> { if(i[0]==id) { return i } });
        let c= t[0][1].feature.geometry.coordinates[0];
        startPoint= (startPoint) ? startPoint : {latitude: c[1], longitude: c[0]};

        this.signalk.api.put(
            context, 
            'navigation/courseGreatCircle/activeRoute/href', 
            `/resources/routes/${id}`
        )
        .subscribe( 
            r=> {
                this.app.data.activeWaypoint= null;
                this.app.data.activeRoute= id;
                this.app.data.navData.pointIndex= 0;
                this.app.data.navData.pointTotal= t[0][1].feature.geometry.coordinates.length;
                this.activeRouteSource.next({action: 'set', value: id});
                this.app.debug('res.activateRoute()');
                this.signalk.api.put(
                    context, 
                    'navigation/courseGreatCircle/activeRoute/startTime', 
                    dt.toISOString()
                )
                .subscribe( 
                    r=> { 
                        this.app.debug('Route start time set');
                        this.setNextPoint(startPoint);
                    },
                    err=> { this.app.showAlert('ERROR:', 'Server could not set start time!') }
                );
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.activateRoute(id, activeId, startPoint);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }  
                else { this.app.showAlert('ERROR:', 'Server could not Activate Route!') }
            }
        );
    }   

    // ** clear activeRoute.href, startTime and (optionally) nextPoint.position **
    clearActiveRoute(activeId:string=null, saveNextPoint:boolean=false) { 
        let context= (activeId) ? activeId : 'self';

        this.signalk.api.put(context, 'navigation/courseGreatCircle/activeRoute/href', null)
        .subscribe( 
            r=> { 
                this.app.data.activeRoute= null;
                this.app.data.navData.pointIndex= -1;
                this.app.data.navData.pointTotal= 0;
                this.activeRouteSource.next({action: 'clear', value: null});
                this.app.debug('res.clearActiveRoute()');
                if(!saveNextPoint) {
                    this.app.debug('clearing nextPoint -> res.setNextPoint(null)');
                    this.setNextPoint(null);
                }             
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.clearActiveRoute(activeId, saveNextPoint);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }   
                else { this.app.showAlert('ERROR:', 'Server could not clear Active Route!') }
            }
        );
    }      
    
    // ** nextPoint.position **
    setNextPoint(pt:{latitude:number, longitude:number}) {
        this.signalk.api.put('self', 
            'navigation/courseGreatCircle/nextPoint/position', 
            pt
        ).subscribe( 
            r=> { 
                this.activeRouteSource.next({action: 'next', value: pt});
                this.app.debug('res.setNextpoint()');
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.setNextPoint(pt);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                } 
                else { this.app.debug(err) }
            }
        );      
    }    

    // **** WAYPOINTS ****

    // ** build and return SKWaypoint object with supplied coordinates
    buildWaypoint(coordinates):any {
        let wpt= new SKWaypoint();
        let wptUuid= this.signalk.uuid.toSignalK();  

        wpt.feature.geometry.coordinates= GeoUtils.normaliseCoords(coordinates);
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
                this.updateSource.next({action: 'get', mode: 'waypoint'});
            },
            err=> {}
        )
    }        
    
    // ** create / update waypoint on server **
    private submitWaypoint(id:string, wpt:SKWaypoint, isNew=false) {
        this.signalk.api.put(`/resources/waypoints/${id}`, wpt).subscribe( 
            res=> { 
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not update Waypoint!');
                    this.getWaypoints(); 
                }
                else if(res['statusCode']==202) { // pending
                    if(isNew) { 
                        this.app.config.selections.waypoints.push(id);
                        this.app.saveConfig();
                    }
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not update Waypoint!');
                        } 
                        else { this.getWaypoints() }      
                    });
                } 
                else if(res['statusCode']==200) {
                    if(isNew) { 
                        this.app.config.selections.waypoints.push(id);
                        this.app.saveConfig();
                    }
                    this.getWaypoints();
                }
            },
            err=> { 
                this.getWaypoints();
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.submitWaypoint(id, wpt, isNew);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }  
                else { this.app.showAlert('ERROR:', 'Server could not update Waypoint details!') }
            }
        );
    }   

    // ** delete waypoint on server **
    private deleteWaypoint(id:string) {
        this.signalk.api.delete(`/resources/waypoints/${id}`)
        .subscribe( 
            res=> {
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not delete Waypoint!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not delete Waypoint!');
                        } 
                        else { this.getWaypoints() }      
                    });
                } 
                else if(res['statusCode']==200) { this.getWaypoints() }              
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.deleteWaypoint(id);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                } 
                else { this.app.showAlert('ERROR:', 'Server could not delete Waypoint!') }
            }
        );        
    }

    // ** modify waypoint point coordinates **
    updateWaypointPosition(id:string, position:[number,number]) {
        let t= this.app.data.waypoints.filter( i=>{ if(i[0]==id) return true });
        if(t.length==0) { return }
        let wpt=t[0][1];
        wpt['feature']['geometry']['coordinates']= GeoUtils.normaliseCoords(position);
        wpt['position']= { 
            latitude: wpt['feature']['geometry']['coordinates'][1], 
            longitude: wpt['feature']['geometry']['coordinates'][0] 
        };
        this.submitWaypoint(id, wpt);
    }    

    // ** Display waypoint properties Dialog **
    showWaypointEditor(e:any=null, position:[number,number]=null) {      
        let resId= null; 
        let title: string;
        let wpt: SKWaypoint;
        let addMode: boolean=true;

        if(!e) {    // ** add at vessel location
            if(!position) { return }
            wpt= new SKWaypoint(); 
            wpt.feature.geometry.coordinates= GeoUtils.normaliseCoords(position);
            wpt.position.latitude= wpt.feature.geometry.coordinates[1];
            wpt.position.longitude= wpt.feature.geometry.coordinates[0];    
            title= 'New waypoint:';      
            wpt.feature.properties['name']= '';
            wpt.feature.properties['cmt']= '';
        }
        else if(!e.id && e.position) { // add at provided position
            wpt= new SKWaypoint(); 
            wpt.feature.geometry.coordinates= GeoUtils.normaliseCoords(e.position);
            wpt.position.latitude= wpt.feature.geometry.coordinates[1];
            wpt.position.longitude= wpt.feature.geometry.coordinates[0];    
            title= 'Drop waypoint:';      
            wpt.feature.properties['name']= '';
            wpt.feature.properties['cmt']= '';
        }
        else { // Edit waypoint details
            resId= e.id;
            title= 'Waypoint Details:'; 
            let w= this.app.data.waypoints.filter( i=>{ if(i[0]==resId) return true });
            if(w.length==0) { return }
            wpt=w[0][1];
            addMode=false;
        }

        this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: title,
                name: (wpt.feature.properties['name']) ? wpt.feature.properties['name'] : null,
                comment: (wpt.feature.properties['cmt']) ? wpt.feature.properties['cmt'] : null,
                position: wpt.feature.geometry['coordinates'],
                addMode: addMode
            }
        }).afterClosed().subscribe( r=> {
            wpt.feature.properties['cmt']= r.data.comment || '';
            wpt.feature.properties['name']= r.data.name || '';            
            if(r.result) { // ** save / update waypoint **
                let isNew= false;
                if(!resId) { // add
                    resId= this.signalk.uuid.toSignalK();
                    isNew= true
                }
                this.submitWaypoint(resId, wpt, isNew);
            }
        });
    }    

    // ** Confirm Waypoint Deletion **
    showWaypointDelete(e:any) { 
        this.app.showConfirm(
            'Do you want to delete this Waypoint?\nNote: Waypoint may be the Start or End of a route so proceed with care!\n \nWaypoint will be removed from the server (if configured to permit this operation).',
            'Delete Waypoint:',
            'YES',
            'NO'
        ).subscribe( ok=> { if(ok) { this.deleteWaypoint(e.id) } });          
    }

  
    // **** REGIONS ****

    // get regions from server
    getRegions(params:string=null) { 
        params= (params && params[0]!='?') ? `?${params}` : params
        return this.signalk.api.get(`/resources/regions${params}`);
    }

    // ** create Region and optionally add note **
    private createRegion(region:any, note?:any) {
        this.signalk.api.put( 
            `/resources/regions/${region.id}`,
            region.data
        ).subscribe( 
            res=>{ 
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not add Region!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not add Region!');
                        }                        
                        else { if(note) { this.createNote(note) } }
                    });
                } 
                else if(res['statusCode']==200 && note) { this.createNote(note) }                
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.createRegion(region, note);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }
                else { this.app.showAlert('ERROR:', 'Server could not add Region!') }
            }
        );        
    }  
    
    // ** delete Region on server **
    private deleteRegion(id:string) {
        this.signalk.api.delete(`/resources/regions/${id}`)
        .subscribe( 
            res=> {  
                if(res['statusCode']>=400) {    // response status is error
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not delete Region!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not delete Region!');
                        }                        
                        else { this.getNotes() }
                    });
                } 
                else if(res['statusCode']==200) { this.getNotes() }                        
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.deleteNote(id);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }
                else { this.app.showAlert(`ERROR: (${err.status})`, err.statusText ? err.statusText : 'Server could not delete Region!') }
            }
        );
    }    

    // ** modify Region point coordinates **
    updateRegionCoords(id:string, coords:Array<Array<[number,number]>>) {
        let t= this.app.data.regions.filter( i=>{ if(i[0]==id) return true });
        if(t.length==0) { return }
        let region=t[0][1];
        region['feature']['geometry']['coordinates']= GeoUtils.normaliseCoords(coords);
        this.createRegion({id: id, data: region});
    }

    // ** confirm Region Deletion **
    showRegionDelete(e:any) {
        // are there notes attached?
        let ca= this.app.data.notes.map( i=>{ if(i[1].region==e.id) {return i[0]} } ).filter(i=> {return i});
        if(ca.length==0){ 
            this.app.showConfirm( 
                'Do you want to delete this Region?\nRegion will be removed from the server (if configured to permit this operation).',
                'Delete Region:',
                'YES',
                'NO'
            ).subscribe( ok=> { if(ok) { this.deleteRegion(e.id) } }); 
        }
        else {
            this.app.showAlert('Message', 'Region cannot be deleted as Notes are attached!');
        }        
    }

    // **** NOTES ****

    // ** get notes / regions from sk server
    getNotes(params:string=null) {
        let rf= (params) ? params : this.app.config.resources.notes.rootFilter;
        rf= this.processTokens(rf);
        if(rf && rf[0]!='?') { rf='?' + rf }
        this.app.debug(`${rf}`);

        let req= [];
        let resRegions= this.getRegions(rf);
        if(resRegions) { 
            resRegions.pipe( catchError(error => of(error)) );
            req.push(resRegions);
        }
        let resNotes= this.signalk.api.get(`/resources/notes${rf}`);
        req.push(resNotes);
        let res= forkJoin(req);
        res.subscribe(
            res=> { 
                if(typeof res[0]['error']==='undefined') { 
                    let r= Object.entries(res[0]);
                    this.app.data.regions= []; 
                    r.forEach( i=> { this.app.data.regions.push([i[0], new SKRegion(i[1]), false]) });
                }   
                this.app.data.notes= this.processNotes(res[1], true, 300);
                this.updateSource.next({action: 'get', mode: 'note'});
            }
        );
    } 

    /* returns array of SKNotes 
        noDesc: true= remove description value
        maxCount: max number of entries to return
    */
    private processNotes(n:any, noDesc:boolean=false, maxCount?:number) {
        let r= Object.entries(n);
        let notes= [];
        // ** set an upper limit of records to process **
        if(maxCount && r.length>maxCount) { r= r.slice(0, maxCount-1) }
        r.forEach( i=> {
            if(noDesc) { i[1]['description']= null }
            if(!i[1]['title']) { 
                i[1]['feature'].properties.title='Note-' + i[0].slice(-6);
            }
            if(typeof i[1]['position']=='undefined') {
                if(typeof i[1]['geohash']!=='undefined') {  // get center of geohash
                    let gh= new GeoHash()
                    let p= gh.center( i[1]['geohash'] );
                    i[1]['position']= {latitude:p[1], longitude:p[0]} 
                }
                else if(typeof i[1]['region']!=='undefined') { // get center of region 
                    let ra= this.app.data.regions.filter( j=> { 
                        if(j[0]==i[1]['region']) { return true }
                    });
                    if(ra.length!=0) {
                        let r= ra[0][1];
                        let pca= r.feature.geometry.type=='MultiPolygon' ? 
                            r.feature.geometry.coordinates[0][0] :
                            r.feature.geometry.coordinates[0]
                        let c= GeoUtils.centreOfPolygon(pca);
                        i[1]['position']= {latitude: c[1], longitude: c[0]};
                    }
                }            
            }
            if( typeof i[1]['position']!== 'undefined') { 
                notes.push([ i[0], new SKNote(i[1]), true ]);
            }
        });
        return notes;
    }    
    
    // ** create note on server **
    private createNote(note:any) { 
        this.signalk.api.post(`/resources/notes`, note ).subscribe(
            res=> { 
                if(res['statusCode']>=400) {    // response status is error
                    this.reOpen= {key: null, value: null}
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not add Note!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not add Note!');
                        }                        
                        else { 
                            this.getNotes();
                            this.reopenRelatedDialog();
                        }
                    });
                }  
                else if(res['statusCode']==200) { 
                    this.getNotes(); 
                    this.reopenRelatedDialog();
                }
            },
            err=> {
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.createNote(note);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }  
                else { this.app.showAlert(`ERROR: (${err.status})`, err.statusText ? err.statusText : 'Server could not add Note!') }
            }
        );        
    }
    // ** update note on server **
    private updateNote(id:string, note:any) {
        this.signalk.api.put(`/resources/notes/${id}`, note ).subscribe(
            res=> { 
                if(res['statusCode']>=400) {    // response status is error
                    this.reOpen= {key: null, value: null}
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not update Note!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not update Note!');
                        }                        
                        else { 
                            this.getNotes();
                            this.reopenRelatedDialog();
                        }
                    });
                }  
                else if(res['statusCode']==200) { 
                    this.getNotes(); 
                    this.reopenRelatedDialog();
                }
            },
            err=> {
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.updateNote(id, note);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                } 
                else { this.app.showAlert(`ERROR: (${err.status})`, err.statusText ? err.statusText : 'Server could not update Note!') }                            
            }
        );        
    } 
    
    // ** delete note on server **
    private deleteNote(id:string) {
        this.signalk.api.delete(`/resources/notes/${id}`)
        .subscribe( 
            res=> {  
                if(res['statusCode']>=400) {    // response status is error
                    this.reOpen= {key: null, value: null}
                    this.app.showAlert(`ERROR: (${res['statusCode']})`, res['message'] ? res['message'] : 'Server could not delete Note!');
                }
                else if(res['statusCode']==202) { // pending
                    this.pendingStatus(res).then( r=> {
                        if(r['statusCode']>=400) {    // response status is error
                            this.app.showAlert(`ERROR: (${r['statusCode']})`, r['message'] ? r['message'] : 'Server could not delete Note!');
                        }                        
                        else { 
                            this.getNotes();
                            this.reopenRelatedDialog();
                        }
                    });
                }  
                else if(res['statusCode']==200) { 
                    this.getNotes(); 
                    this.reopenRelatedDialog();
                }                         
            },
            err=> { 
                if(err.status && err.status==401) { 
                    this.showAuth().subscribe( res=> {
                        if(res.cancel) { this.authResult(false) }
                        else { // ** authenticate
                            this.signalk.login(res.user, res.pwd).subscribe(
                                r=> {   // ** authenticated
                                    this.authResult(true, r['token']);
                                    this.deleteNote(id);
                                },
                                err=> {   // ** auth failed
                                    this.authResult(false);
                                    this.showAuth();
                                }
                            );
                        }
                    });
                }
                else { this.app.showAlert(`ERROR: (${err.status})`, err.statusText ? err.statusText : 'Server could not delete Note!') }
            }
        );
    }

    // ** Open Note for editing **
    private openNoteForEdit(e:any) {
        this.dialog.open(NoteDialog, {
            disableClose: true,
            data: {
                note: e.note,
                editable: e.editable,
                addNote: e.addNote,
                title: e.title
            }
        }).afterClosed().subscribe( r=> {        
            if(r.result) { // ** save / update waypoint **
                let note= r.data;
                if(e.region && e.createRegion) {  // add region + note
                    this.createRegion(e.region, note);
                }
                else if(!e.noteId) { // add note
                    this.createNote(note);
                }
                else {      // update note
                    this.updateNote(e.noteId, note);
                }                    
            }
            else {  // cancel
                this.reopenRelatedDialog();
            }
        });
    }

    // ** reopen last related dialog **
    private reopenRelatedDialog(noReset:boolean=false) {
        if(this.reOpen && this.reOpen.key) { 
            this.showRelatedNotes(this.reOpen.value, this.reOpen.key);
            if(noReset) { return }
            else { this.reOpen= {key: null, value: null} }
        }        
    }

    // ** Show Related Notes dialog **
    showRelatedNotes(id:string, relatedBy:string='region') {
        this.signalk.api.get(`/resources/notes/?${relatedBy}=${id}`).subscribe(
            res=> {
                let notes= this.processNotes(res);
                this.dialog.open(RegionDialog, {
                    disableClose: true,
                    data: { notes: notes, relatedBy: relatedBy }
                }).afterClosed().subscribe( r=> {        
                    if(r.result) { 
                        if(relatedBy) { this.reOpen= {key: relatedBy, value: id} }
                        else { this.reOpen= {key: null, value: null} }
                        switch(r.data) {
                            case 'edit':
                                this.showNoteEditor({id: r.id});
                                break;
                            case 'add':
                                if(relatedBy=='region') {
                                    this.showNoteEditor({region: {id: id, exists: true} });
                                }
                                if(relatedBy=='group') {
                                    this.updateSource.next({action: 'new', mode: 'note', group: id})
                                }                                
                                break;
                            case 'delete':
                                this.showNoteDelete({id: r.id});
                                break;
                        }
                    }
                });                
            },
            err=> {
                this.app.showAlert('ERROR', 'Unable to retrieve Notes for specified Region!');
            }
        );  
    }

    // ** Add / Update Note Dialog
    showNoteEditor(e:any=null) {      
        let note: SKNote;
        let data= {
            noteId: null,
            note: null,
            editable: true,
            addNote: true,
            title: null,
            region: null,
            createRegion: null
        }

        if(!e) { return }
        if(!e.id && e.position) { // add note at provided position
            data.title= 'Add Note:'; 
            note= new SKNote(); 
            if(e.group) { note.group= e.group }
            e.position= GeoUtils.normaliseCoords(e.position);
            note.position= {latitude: e.position[1], longitude: e.position[0]};    
            note.title= '';
            note.description= '';
            data.note= note;
            this.openNoteForEdit(data);
        }
        else if(!e.id && !e.position && e.group) { // add note in provided group with no position
            data.title= 'Add Note to Group:'; 
            note= new SKNote(); 
            if(e.group) { note.group= e.group }
            note.position= null;    
            note.title= '';
            note.description= '';
            data.note= note;
            this.openNoteForEdit(data);
        }        
        else if(!e.id && e.region) { // add note to exisitng or new region
            data.title= 'Add Note to Region:'; 
            data.region= e.region; 
            note= new SKNote(); 
            note.region= e.region.id;    
            note.title= '';
            note.description= '';
            data.note= note;
            data.createRegion= (e.region.exists) ? false : true;
            this.openNoteForEdit(data);
        }              
        else {    // edit selected note details 
            let resAttr= this.signalk.api.get(`/resources/notes/${e.id}/meta/_attr`).pipe( catchError(error => of(error)) );
            let resNote= this.signalk.api.get(`/resources/notes/${e.id}`);
            let res= forkJoin(resAttr, resNote);
            res.subscribe(
                res=> { 
                    // ** note data 
                    data.noteId= e.id;
                    data.title= 'Edit Note:'; 
                    data.note= res[1];
                    data.addNote=false;
                    // ** note attributes
                    if(typeof res[0]['error']==='undefined') { 
                        if(!data.note.properties) { data.note.properties= {} }
                        if(res['_mode']) {
                            let mode= res['_mode'].toString();
                            let ro= true;
                            for(let i=0; i<mode.length; i++) {
                                let m= ('000' + parseInt(mode[i]).toString(2)).slice(-3);
                                if(m[1]=='0') { ro= ro && false }
                            }
                            data.note.properties.readOnly= ro;
                        }
                        else { data.note.properties.readOnly= true }
                    }                      
                    this.openNoteForEdit(data);  
                },
                err=> { this.app.showAlert('ERROR', 'Unable to retrieve Note!') }
            );
        }
        
    }    

    // ** Note info Dialog **
    showNoteInfo(e:any) {
        this.signalk.api.get(`/resources/notes/${e.id}`).subscribe(
            res=> {
                this.dialog.open(NoteDialog, {
                    disableClose: true,
                    data: { note: res, editable: false }
                }).afterClosed().subscribe( r=> {
                    if(r.result) { // ** open in tab **
                        if(r.data== 'url') { window.open(res['url'], 'note') }
                        if(r.data== 'edit') { this.showNoteEditor({id: e.id}) }
                        if(r.data== 'delete') { this.showNoteDelete({id: e.id}) }
                        if(r.data== 'group') { this.showRelatedNotes(r.value, r.data) }
                    }
                });  
            },
            err=> {
                this.app.showAlert('ERROR', 'Unable to retrieve Note!');
            }
        );      
    }

    // ** confirm Note Deletion **
    showNoteDelete(e:any) {
        this.app.showConfirm(
            'Do you want to delete this Note?\nNote will be removed from the server (if configured to permit this operation).',
            'Delete Note:',
            'YES',
            'NO'
        ).subscribe( ok=> {
            if(ok) { this.deleteNote(e.id) }
            else { this.reopenRelatedDialog() }
        });         
    }

    // ** modify Note position **
    updateNotePosition(id:string, position:[number,number]) {
        let t= this.app.data.notes.filter( i=>{ if(i[0]==id) return true });
        if(t.length==0) { return }
        let note=t[0][1];
        position= GeoUtils.normaliseCoords(position);
        note['position']= { latitude: position[1], longitude: position[0] };
        this.updateNote(id, note);
    }   

    // *******************************

    // ** check pending request
    private async pendingStatus(status:any, max:number=10, waitTime:number=1000) {
        if(!status.href) { return { state: 'COMPLETED', statusCode: 200 } }
        let pending: boolean= true;
        let pollCount:number= 0;
        let result:any;
        while(pending) {
            pollCount++;
            let r= await this.poll(status.href, waitTime);
            if( r['state'] && r['state']!='PENDING') {
                pending=false;
                result= r;
            }
            else {
                if(pollCount>=max) { 
                    pending=false;
                    result= { 
                        state: 'COMPLETED', 
                        statusCode: 410, 
                        message: `Max. number of ${max} status requests reached.`
                    }                    
                }
            }
        }
        return result;
    }
    // ** poll pending operation **
    private poll(href:string, waitTime:number=1000) {
        return new Promise( (resolve, reject)=> {
            setTimeout( ()=> {
                this.signalk.get(href).subscribe( 
                    res=> { resolve(res) },
                    err=> { 
                        resolve( { 
                            state: 'ERROR', 
                            statusCode: 404, 
                            message: 'Server returned error when polling request status!'
                        } );
                    }
                );
            }, waitTime);
        });
    }

    // ** show login dialog **
    private showAuth(message?:string, cancelWarning:boolean=true, onConnect?:boolean) {
        return this.dialog.open(LoginDialog, {
            disableClose: true,
            data: { message: message || 'Login to Signal K server.'}
        }).afterClosed();             
    }   

    // ** record authentication result state **
    private authResult(ok:boolean=false, token:string=null) {
        this.signalk.authToken= token;
        this.app.db.saveAuthToken(token); 
        this.app.data.hasToken= ok;
    }
    
    // ** process url tokens
    private processTokens(s:string):string {
        if(!s) { return s }
        let ts= s.split('%');
        if(ts.length>1) {
            let uts= ts.map( i=>{
                if(i=='map:latitude') { return this.app.config.map.center[1] }
                else if(i=='map:longitude') { return this.app.config.map.center[0] }
                else if(i=='note:radius') { return this.app.config.resources.notes.getRadius }
                else { return i }
            });
            s= uts.join('');
        }
        return s;
    }

}
