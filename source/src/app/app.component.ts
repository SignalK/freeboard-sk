import { Component } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import { HttpClient } from '@angular/common/http';

import { AppInfo } from './app.info';
import { AboutDialog, ConfirmDialog, AlertDialog } from './lib/app-ui';
import { ResourceDialog } from './lib/ui/resource-dialogs';
import { SettingsPage } from './pages';

import { SignalKClient } from 'signalk-client-angular';
import { SKResources, SKWaypoint, SKRoute } from './lib/sk-resources';
import { SKData, SKVessel } from './lib/sk-data';
import { Convert } from './lib/convert';
import { GeoUtils } from './lib/geoutils';

import 'hammerjs';
import { proj, coordinate, style } from 'openlayers';

declare var UUIDjs: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

    public display= {
        badge: { hide: true, value: ''},
        leftMenuPanel: false,
        routeList: false,
        waypointList: false,
        chartList: false,
        anchorWatch: false,
        vessels: { 
            self: new SKVessel(), 
            aisTargets: Array<SKVessel>()
        },
        alarms: new Map(),
        map: { center: [0,0], zoomLevel: 2, rotation: 0 },        
        vesselLines: {
            twd: [null,null],
            awa: [null,null],
            bearing: [null,null],
            heading: [null,null],
            anchor: []
        },        
        overlay: {
            show: false,
            position: [0,0],
            title: '',
            content: null
        }
    }

    public draw= {
        enabled: false,
        mode: null,
        type: 'Point'
    }

    public measure= {
        enabled: false,
        end: false,
        geom: null,
        style: null
    }    

    private subOnConnect;
    private subOnError;
    private subOnMessage;
    private subOnClose

    private lastInstUrl: string;
    public instUrl: SafeResourceUrl;
    public resmgrUrl: SafeResourceUrl;
    public coord;

    private watchDog;       // ** settings watchdog timer
    private isDirty: boolean=false;

    private depthAlarmSmoothing: boolean= false;
    private trailTimer;     // ** timer for logging vessel trail

    constructor(
        public app: AppInfo, 
        private http: HttpClient,
        private dom: DomSanitizer,
        public signalk: SignalKClient,
        public skres: SKResources,
        public skdata: SKData,
        private dialog: MatDialog) { 
            this.lastInstUrl= this.app.config.plugins.instruments;
            this.instUrl= dom.bypassSecurityTrustResourceUrl(`${this.app.host}${this.app.config.plugins.instruments}`);
            if(this.app.config.plugins.resources) {
                this.resmgrUrl= dom.bypassSecurityTrustResourceUrl(`${this.app.host}${this.app.config.plugins.resources}`);
            }
            this.coord= coordinate;
            this.measure.style= new style.Style({
                stroke: new style.Stroke({
                    color: 'purple', 
                    lineDash: [10,10],
                    width: 2
                })   
            });   
        }

    ngAfterViewInit() { }
    ngOnInit() {
        // ** apply loaded app config	
        this.display.map.center= this.app.config.map.center;
        this.display.map.zoomLevel= this.app.config.map.zoomLevel;
        this.display.map.rotation= this.app.config.map.rotation;
        // ** connect to signalk server and intialise
        this.initSignalK(); 
        // ** periodically persist state
        this.watchDog= setInterval( ()=> { 
            if(this.isDirty) { 
                this.app.saveConfig(); 
                this.isDirty=false; 
            }
        }, 30000 );

        // ** respond to settings loaded / saved
        this.app.settings$.subscribe( value=> {
            if(this.lastInstUrl!= this.app.config.plugins.instruments) {
                this.lastInstUrl= this.app.config.plugins.instruments
                this.instUrl= this.dom.bypassSecurityTrustResourceUrl(`${this.app.host}${this.app.config.plugins.instruments}`);
            }
            if(this.app.config.plugins.resources) {
                this.resmgrUrl= this.dom.bypassSecurityTrustResourceUrl(`${this.app.host}${this.app.config.plugins.resources}`);
            }            
        });           
    } 

    ngOnDestroy() {
        // ** clean up
        this.terminateSignalK();
        clearInterval(this.watchDog);
        if(this.trailTimer) { clearInterval(this.trailTimer) }
    }     
  
    //** open about dialog **
    openAbout() { 
        this.dialog.open(AboutDialog, {
            disableClose: false,
            data: {
                name: this.app.name,  
                version: this.app.version, 
                description: this.app.description, 
                logo: this.app.logo,  
                url: this.app.url
            }
        });  
    }  

    //** open settings dialog **
    openSettings() {  this.dialog.open( SettingsPage, { disableClose: false }) }      

    // ** alert message
    showAlert(title, message) {
        let dref= this.dialog.open(AlertDialog, {
            disableClose: false,
            data: { message: message, title: title }
        });         
    }

    // ********** MAP / MAP EVENTS *****************
    
    mapMoveEvent(e) {
        let v= e.map.getView();
        let z= v.getZoom();
        if(!this.app.config.map.mrid) { this.app.config.map.mrid= v.getProjection().getCode() }
        let center = proj.transform(
            v.getCenter(), 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );
        this.app.config.map.zoomLevel= z;
        this.app.config.map.center= center;
        if(!this.app.config.map.moveMap) { 
            this.app.saveConfig();
            this.isDirty=false;
        }
        else { this.isDirty=true }
    }

    mapRotate() {
        if(this.app.config.map.northUp) { this.display.map.rotation=0 }
        else { this.display.map.rotation= 0-this.display.vessels.self.heading }
    }

    mapMove() { 
        let t=this.display.vessels.self.position;
        t[0]+=0.0000000000001;
        this.display.map.center= t;
    }

    mapMouseClick(e) {
        if(this.measure.enabled) {
            let l= this.measure.geom.getLength();
            let c= proj.transform(
                this.measure.geom.getLastCoordinate(), 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            this.display.overlay.position= c;
            l= (this.app.config.units.distance=='m') ? 
                `${(l/1000).toFixed(2)} km` :
                `${Convert.kmToNauticalMiles(l/1000).toFixed(2)} NM`
            this.display.overlay.title= l;               
        }        
        else if(!this.draw.enabled) {
            e.map.forEachFeatureAtPixel(e.pixel, (feature, layer)=> {
                this.display.overlay.show= this.formatPopover( 
                    feature.getId(),
                    e.coordinate,
                    this.app.config.map.mrid
                );         
            });
        }
    }

    mapMouseMove(e) {
        if(this.measure.enabled && this.measure.geom) {
            let cl= proj.transform(
                this.measure.geom.getLastCoordinate(), 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            let c= proj.transform(
                e.coordinate, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            let l= this.measure.geom.getLength() + GeoUtils.distanceTo(cl,c);
            l= (this.app.config.units.distance=='m') ? 
                `${(l/1000).toFixed(2)} km` :
                `${Convert.kmToNauticalMiles(l/1000).toFixed(2)} NM`
            this.display.overlay.position= c;
            this.display.overlay.title= l;            
        }            
    }    

    mapVesselLines() {
        if(!this.display.vessels.self.sog) { return }
        
        this.display.vesselLines.heading= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                this.display.vessels.self.heading,
                (this.display.vessels.self.sog * 60)
            )
        ];

        this.display.vesselLines.bearing= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                this.display.vessels.self.heading,
                (this.display.vessels.self.sog * 30000)
            )
        ];  
        
        let ca= (this.app.config.map.northup) ? 
            this.display.vessels.self.wind.awa :
            this.display.vessels.self.wind.awa + (this.display.vessels.self.cogTrue || this.display.vessels.self.headingTrue);

        this.display.vesselLines.awa= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                ca,
                (this.display.vessels.self.wind.aws || this.display.vessels.self.sog) * 60
            )
        ];        
        
        this.display.vesselLines.twd= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                this.display.vessels.self.wind.twd,
                (this.display.vessels.self.wind.tws || this.display.vessels.self.sog) * 60
            )
        ];

        if(!this.app.config.anchor.raised) {
            this.display.vesselLines.anchor= [
                this.app.config.anchor.position,
                this.display.vessels.self.position
            ];
        }
    }

    toggleMoveMap() { 
        this.app.config.map.moveMap= !this.app.config.map.moveMap;
        if(this.app.config.map.moveMap) { this.mapMove() }
        this.app.saveConfig();
    }

    toggleNorthUp() { 
        this.app.config.map.northUp= !this.app.config.map.northUp;
        this.mapRotate();
        this.app.saveConfig();
    }

    popoverClosed() { this.display.overlay.show= false }

    formatPopover(id, coord, prj) {
        this.display.overlay['addWaypoint']=null;  
        this.display.overlay['activateRoute']=null;
        this.display.overlay['id']=null;    
        this.display.overlay['type']=null;   
        this.display.overlay['showProperties']=false;
        this.display.overlay['canDelete']=null;
        this.display.overlay.content=[];

        if(!id) { return false }

        let item= null;
        let info= [];        
        let t= id.split('.');

        this.display.overlay.position= proj.transform(
            coord, 
            prj, 
            this.app.config.map.srid
        );        

        switch(t[0]) {
            case 'vessels':
                this.display.overlay.title= (this.display.vessels.self.name) ? 
                    this.display.vessels.self.name : 'Self'; 
                info.push(['MMSI', this.display.vessels.self.mmsi]);
                info.push(['Call Sign', this.display.vessels.self.callsign]);  
                info.push(['State', this.display.vessels.self.state]);     
                this.display.overlay['addWaypoint']=true;
                this.display.overlay['type']='vessel';
                this.display.overlay['showProperties']=false;
                break;
            case 'ais':
                item= this.display.vessels.aisTargets.filter( i=>{ if(i.id==t[1] + '.' + t[2]) return true });
                if(!item) { return false }
                this.display.overlay['type']='ais'
                this.display.overlay['showProperties']=false;
                this.display.overlay.title= 'AIS';    
                info.push(['Name', item[0].name]); 
                info.push(['MMSI', item[0].mmsi]);  
                info.push(['Call Sign', item[0].callsign]);    
                info.push(['State', item[0].state]);  
                info.push(['Latitude', item[0].position[1] ]); 
                info.push(['Longitude', item[0].position[0] ]);   
                info.push(['SOG', Convert.msecToKnots(item[0].sog).toFixed(1) + ' kn']);  
                info.push(['COG', Convert.radiansToDegrees(item[0].cogTrue) + String.fromCharCode(186)]);         
                break;
            case 'route':
                item= this.app.data.routes.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.display.overlay['showProperties']=true;
                this.display.overlay['type']='route';
                this.display.overlay.title= 'Route';
                this.display.overlay['id']=t[1];
                this.display.overlay['activateRoute']=!item[0][3];
                this.display.overlay['canDelete']= !item[0][3];
                info.push(['Name', item[0][1].name]);
                let d= (this.app.config.units.distance=='m') ?
                    [ (item[0][1].distance/1000).toFixed(1), 'km' ] :
                    [Convert.kmToNauticalMiles( item[0][1].distance/1000 ).toFixed(1), 'NM'];
                info.push(['Distance', `${d[0]} ${d[1]}`]);
                info.push(['Desc.', item[0][1].description]);
                
                break;
            case 'waypoint':
                item= this.app.data.waypoints.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.display.overlay['showProperties']=true;
                this.display.overlay['type']='waypoint';
                this.display.overlay.title= 'Waypoint';   
                this.display.overlay['canDelete']= (this.display.overlay['type']=='waypoint' && !this.display.overlay['addWaypoint']) ? true : false;
                if(item[0][1].feature.properties.name) {
                    info.push( ['Name', item[0][1].feature.properties.name] );
                }
                if(item[0][1].feature.properties.cmt) {
                    info.push( ['Desc.', item[0][1].feature.properties.cmt] );
                }
                info.push(['Latitude', item[0][1]['position']['latitude']]); 
                info.push(['Longitude', item[0][1]['position']['longitude']]);    
                this.display.overlay['id']=t[1];             
                break;       
        }
        this.display.overlay.content= info;
        return true;
    }

    // ******** DRAW / EDIT EVENTS ************

    drawStart(mode) {
        switch(mode) {
            case 'waypoint':
                this.draw.type= 'Point'
                this.draw.mode= mode;
                this.draw.enabled= true;
                break;
            case 'route':
                this.draw.type= 'LineString'
                this.draw.mode= mode;
                this.draw.enabled= true;
                break;                
            default: 
                return;
        }
    }

    handleDrawEnd(e) {
        this.draw.enabled=false;
        let c;
        switch(this.draw.type) {
            case 'Point':
                c = proj.transform(
                    e.feature.getGeometry().getCoordinates(), 
                    this.app.config.map.mrid, 
                    this.app.config.map.srid
                );                 
                this.waypointAdd({position: c});
                break;
            case 'LineString':
                let rc= e.feature.getGeometry().getCoordinates();
                c= rc.map( i=> { 
                    return proj.transform(
                        i, 
                        this.app.config.map.mrid, 
                        this.app.config.map.srid
                    );
                });
                this.routeAdd({coordinates: c});
                break;
        }
    }

    measureStart() { this.measure.enabled=true }

    handleMeasure(e) {
         if(e.type=='drawstart') {         
            this.measure.geom= e.feature.getGeometry();
            let c= proj.transform(
                this.measure.geom.getLastCoordinate(), 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            );  
            this.formatPopover(null,null,null);          
            this.display.overlay.position= c;
            this.display.overlay.title= '0';
            this.display.overlay.show= true;            
        }
        else if(e.type=='drawend') {
            this.measure.geom= null;         
            this.display.overlay.show= false;
            this.measure.enabled= false;
        }    
    }
 
    // ******** RESOURCE EVENTS ************

    displayLeftMenu( menulist='', show: boolean= false) {
        this.display.leftMenuPanel= show;
        this.display.routeList= false;
        this.display.waypointList= false; 
        this.display.chartList= false;
        this.display.anchorWatch= false;
        switch (menulist) {
            case 'routeList': 
                this.display.routeList= show;
                break;
            case 'waypointList': 
                this.display.waypointList= show;
                break;   
            case 'chartList': 
                this.display.chartList= show;
                break;  
            case 'anchorWatch': 
                this.display.anchorWatch= show;
                break;                                      
            default: 
                this.display.leftMenuPanel= false;     
        }
    }

    // ** handle display resource properties **
    resourceProperties(r) {
        switch(r.type) {
            case 'waypoint': 
                this.waypointAdd(r);
                break;
            case 'route': 
                this.routeDetails(r);
                break;                
        }
    }

     // ** handle resource deletion **
    resourceDelete(id) {
        switch(this.display.overlay['type']) {
            case 'waypoint':
                this.waypointDelete({id: id});
                break;
            case 'route':
                this.routeDelete({id: id});
                break;                
        }    
    }

    // ** view / update route details **
    routeDetails(e) {
        let t= this.app.data.routes.filter( i=>{ if(i[0]==e.id) return true });
        if(t.length==0) { return }
        let rte=t[0][1];
        let resId= t[0][0];

        let dref= this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: 'Route Details:',
                name: (rte['name']) ? rte['name'] : null,
                comment: (rte['description']) ? rte['description'] : null,
                type: 'route'
            }
        });  
        dref.afterClosed().subscribe( r=> {
            if(r.result) { // ** save / update route **
                rte['description']= r.data.comment;
                rte['name']= r.data.name;
                if(this.app.config.usePUT) { // update
                    this.signalk.apiPut(
                        'self',
                        `/resources/routes`,
                        resId, 
                        rte
                    ).subscribe( 
                        r=>{ 
                            this.skres.getRoutes();
                            if(r['state']=='COMPLETED') { this.app.debug('SUCCESS: Route updated.') }
                            else { this.showAlert('ERROR:', 'Server could not update Route details!') }
                        },
                        e=> { 
                            this.skres.getRoutes();
                            this.showAlert('ERROR:', 'Server could not update Route details!');
                        }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `/resources/routes/${resId}`, rte);
                    this.skres.getRoutes();
                }
            }
        });
    }

    routeDelete(e) { 
        let dref= this.dialog.open(ConfirmDialog, {
            disableClose: false,
            data: {
                message: 'Do you want to delete this Route?\n \nRoute will be removed from the server (if configured to permit this operation).',
                title: 'Delete Route:',
                button1Text: 'YES',
                button2Text: 'NO'
            }
        }); 
        dref.afterClosed().subscribe( res=> {
            if(res) {
                if(this.app.config.usePUT) {
                    this.signalk.apiPut('self','resources.routes', e.id, null)
                    .subscribe( 
                        r=> {  
                            this.skres.getRoutes();
                            this.skres.getWaypoints();                            
                            if(r['state']=='COMPLETED') { this.app.debug('SUCCESS: Route deleted.') }
                            else { this.showAlert('ERROR:', 'Server could not delete Route!') }
                        },
                        e=> { this.showAlert('ERROR:', 'Server could not delete Route!') }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `resources.routes.${e.id}`, null);
                    this.skres.getRoutes();
                    this.skres.getWaypoints();                    
                }                       
            }      
        });        
    }

    routeActivate(e) { 
        let dt= new Date();
        this.signalk.sendUpdate('self', 'navigation.course.activeRoute.href', `/resources/routes/${e.id}`);
        this.signalk.sendUpdate('self', 'navigation.course.activeRoute.startTime', dt.toISOString());
    }

    routeAdd(e) {
        if(!e.coordinates) { return }    
        let res= this.skres.buildRoute(e.coordinates);
        
        let dref= this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: 'New Route:',
                name: null,
                comment: null,
                type: 'route',
                addMode: true
            }
        });  
        dref.afterClosed().subscribe( r=> {
            if(r.result) { // ** save route **
                res['route'][1]['description']= r.data.comment || '';
                res['route'][1]['name']= r.data.name;
                if(this.app.config.usePUT) {
                    this.signalk.apiPut(
                        'self',
                        `/resources/routes`,
                        res['route'][0], 
                        res['route'][1]
                    ).subscribe( 
                        r=>{ 
                            this.skres.getRoutes();
                            if(r['state']=='COMPLETED') { 
                                this.submitWaypoint(res['wptStart'][0], res['wptStart'][1], true);
                                this.submitWaypoint(res['wptEnd'][0], res['wptEnd'][1], true);               
                                this.app.debug('SUCCESS: Route updated.');
                                this.app.config.selections.routes.push(res['route'][0]);
                                this.app.saveConfig();                                
                            }
                            else { this.showAlert('ERROR:', 'Server could not add Route!') }
                            },
                        e=> { 
                            this.skres.getRoutes();
                            this.showAlert('ERROR:', 'Server could not add Route!');
                        }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `/resources/routes/${res['route'][0]}`, res['route'][1]);
                    this.skres.getRoutes();
                    this.submitWaypoint(res['wptStart'][0], res['wptStart'][1], true);
                    this.submitWaypoint(res['wptEnd'][0], res['wptEnd'][1], true);               
                    
                }
            }
        });
    }

    routeSelected(e) {
        let t= this.app.data.routes.map(
            i=> { if(i[2]) { return i[0] }  }
        );
        this.app.config.selections.routes= t.filter(
            i=> { return (i) ? true : false }
        );      
        this.app.saveConfig();
    }

    waypointDelete(e) { 
        let dref= this.dialog.open(ConfirmDialog, {
            disableClose: false,
            data: {
                message: 'Do you want to delete this Waypoint?\nNote: Waypoint may be the Start or End of a route so proceed with care!\n \nWaypoint will be removed from the server (if configured to permit this operation).',
                title: 'Delete Waypoint:',
                button1Text: 'YES',
                button2Text: 'NO'
            }
        }); 
        dref.afterClosed().subscribe( res=> {
            if(res) {
                if(this.app.config.usePUT) {
                    this.signalk.apiPut('self','resources.waypoints', e.id, null)
                    .subscribe( 
                        r=> {  
                            this.skres.getWaypoints();
                            if(r['state']=='COMPLETED') { this.app.debug('SUCCESS: Waypoint deleted.') }
                            else { this.showAlert('ERROR:', 'Server could not delete Waypoint!') }                            
                        },
                        e=> { this.showAlert('ERROR:', 'Server could not delete Waypoint!') }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `resources.waypoints.${e.id}`, null);
                    this.skres.getWaypoints();                    
                }
            }
        });          
    }

    waypointAdd(e=null) {      
        let resId= null; 
        let title: string;
        let wpt: SKWaypoint;
        let addMode: boolean=true;

        if(!e) {    // ** add at vessel location
            wpt= new SKWaypoint(); 
            wpt.feature.geometry.coordinates= this.display.vessels.self.position;
            wpt.position.latitude= this.display.vessels.self.position[1];
            wpt.position.longitude= this.display.vessels.self.position[0];    
            title= 'New waypoint:';      
            wpt.feature.properties['name']= '';
            wpt.feature.properties['cmt']= '';
        }
        else if(!e.id && e.position) { // add at provided position
            wpt= new SKWaypoint(); 
            wpt.feature.geometry.coordinates= e.position;
            wpt.position.latitude= e.position[1];
            wpt.position.longitude= e.position[0];    
            title= 'Drop waypoint:';      
            wpt.feature.properties['name']= '';
            wpt.feature.properties['cmt']= '';
        }
        else { // selected waypoint details
            resId= e.id;
            title= 'Waypoint Details:'; 
            let w= this.app.data.waypoints.filter( i=>{ if(i[0]==resId) return true });
            if(w.length==0) { return }
            wpt=w[0][1];
            addMode=false;
        }

        let dref= this.dialog.open(ResourceDialog, {
            disableClose: true,
            data: {
                title: title,
                name: (wpt.feature.properties['name']) ? wpt.feature.properties['name'] : null,
                comment: (wpt.feature.properties['cmt']) ? wpt.feature.properties['cmt'] : null,
                position: wpt.feature.geometry['coordinates'],
                addMode: addMode
            }
        });  
        dref.afterClosed().subscribe( r=> {
            wpt.feature.properties['cmt']= r.data.comment || '';
            wpt.feature.properties['name']= r.data.name || '';            
            if(r.result) { // ** save / update waypoint **
                let isNew= false;
                if(!resId) { // add
                    let uuid= new UUIDjs._create4().hex;  
                    resId= `urn:mrn:signalk:uuid:${uuid}`;
                    isNew= true
                }
                this.submitWaypoint(resId, wpt, isNew);
            }
        });
    }

    submitWaypoint(id, wpt, isNew=false) {
        if(this.app.config.usePUT) {
            this.signalk.apiPut(
                'self',
                `/resources/waypoints`,
                id, 
                wpt
            ).subscribe( 
                r=>{ 
                    if(r['state']=='COMPLETED') { 
                        this.app.debug('SUCCESS: Waypoint updated.');
                        if(isNew) { 
                            this.app.config.selections.waypoints.push(id);
                            this.app.saveConfig();
                        }
                        this.skres.getWaypoints();
                    }
                    else { 
                        this.skres.getWaypoints();
                        this.showAlert('ERROR:', 'Server could not update Waypoint details!');
                    }
                },
                e=> { 
                    this.skres.getWaypoints();
                    this.showAlert('ERROR:', 'Server could not update Waypoint details!');
                }
            );
        }
        else { 
            this.signalk.sendUpdate('self', `resources.waypoints.${id}`, wpt);
            this.skres.getWaypoints();
        }
    }

    waypointSelected(e) {
        let t= this.app.data.waypoints.map( i=> { if(i[2]) { return i[0] }  });
        this.app.config.selections.waypoints= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
    }    

    chartSelected(e) {
        if(!e) { return }
        let t= this.app.data.charts.map(
            i=> { if(i[2]) { return i[0] } }
        );
        this.app.config.selections.charts= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
    } 

    // ******** Anchor Watch EVENTS ************
    anchorEvent(e) {
        if(e.action=='radius') {
            this.app.config.anchor.radius= e.radius;
            return;
        }
        if(!e.raised) {  // ** drop anchor
            this.app.config.anchor.raised= false;
            this.app.config.anchor.position= this.display.vessels.self.position;
            this.signalk.post( 
                `/plugins/anchoralarm/setAnchorPosition`, 
                { 
                    position: {
                        latitude: this.app.config.anchor.position[1],
                        longitude: this.app.config.anchor.position[0]
                    } 
                }
            ).subscribe(
                r=> { this.dropAnchor(e.radius) },
                err=> { 
                    if(this.parseAnchorError(err)) { this.dropAnchor(e.radius) }
                    else { this.getAnchorStatus() }
                }
            );             
                           
        }
        else {  // ** raise anchor
            this.app.config.anchor.raised= true;
            this.signalk.post( `/plugins/anchoralarm/raiseAnchor`, null )
            .subscribe(
                r=> { this.getAnchorStatus() },
                err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
            );
        }
    }

    dropAnchor(radius) {
        this.signalk.post( 
            `/plugins/anchoralarm/dropAnchor`, 
            {radius: radius}
        ).subscribe(
            r=> { this.getAnchorStatus() },
            err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
        );   
    }

    parseAnchorError(e) {
        this.app.debug(e); 
        let errText=`Reported error:\n${e.error || e.statusText}`;
        if(e.status && e.status!=200) { // plugin error
            console.warn(errText);
            this.showAlert('AnchorWatch Plugin says:', errText);
            return false;
        }  
        else { return true }      
    }

    getAnchorStatus() {
        // ** query anchor status
        this.app.debug('Retrieving anchor status...');
        this.signalk.apiGet('/vessels/self/navigation/anchor').subscribe(
            r=> {
                if(r['position'] && r['position']['value']) {
                    let p= r['position']['value'];
                    if(p.latitude && p.longitude) {
                        this.app.config.anchor.position= [
                            p.longitude,
                            p.latitude
                        ]
                        this.app.config.anchor.raised= false;
                    }  
                    else { 
                        this.app.config.anchor.position= this.display.vessels.self.position; 
                        this.app.config.anchor.raised= true;
                    }
                }
                if(r['maxRadius'] && r['maxRadius']['value']) { 
                    this.app.config.anchor.radius= r['maxRadius']['value'];
                }    
                
                this.mapVesselLines(); 
                this.app.saveConfig(); 
            },
            e=> { 
                this.app.config.anchor.position= [0,0];
                this.app.config.anchor.raised= true;
            }
        ); 
    }

    // ******** Alarm EVENTS ************
    muteAlarm(id) { this.display.alarms.get(id)['muted']=true }

    acknowledgeAlarm(id) { this.display.alarms.get(id)['acknowledged']=true }
 
    
    // ******** SIGNAL K *************
    
    // ** initialise and connect to signalk server
    initSignalK() {
        this.subOnConnect= this.signalk.onConnect.subscribe( e=> { this.onConnect(e)} );
        this.subOnError= this.signalk.onError.subscribe( e=> { this.onError(e)} );
        this.subOnMessage= this.signalk.onMessage.subscribe( e=> { this.onMessage(e)} );
        this.subOnClose= this.signalk.onClose.subscribe( e=> { this.onClose(e)} );
        this.connectSignalKServer();
    }

    // ** establish connection 
    connectSignalKServer() {
        this.signalk.hello(this.app.hostName, this.app.hostPort, this.app.hostSSL)
        .subscribe(
            res=> {
                this.signalk.connect( this.app.hostName, this.app.hostPort, this.app.hostSSL, 'none');
                this.checkAnchorWatchPlugin();
            },
            err=> {
                let dRef= this.dialog.open(AlertDialog, {
                    disableClose: false,
                    data: {
                        title: 'Connection Error:',  
                        message: 'Unable to contact Signal K server!', 
                        buttonText: 'Try Again'
                    }
                });  
                dRef.afterClosed().subscribe( ()=>{ this.connectSignalKServer() } );
            }
        ) 
    }

    // ** tear down connection 
    terminateSignalK() {
        this.subOnConnect.unsubscribe();
        this.subOnError.unsubscribe();
        this.subOnMessage.unsubscribe();
        this.subOnClose.unsubscribe();      
        this.signalk.disconnect();
    }

    checkAnchorWatchPlugin() {
        this.signalk.get(this.app.config.anchor.plugin.url).subscribe(
            r=> {
                this.app.config.anchor.plugin.installed= true;
                this.app.config.anchor.plugin.enabled= r['enabled'];
            },
            e=> { 
                this.app.config.anchor.plugin.installed=false;
                this.app.config.anchor.plugin.enabled=false;
            }
        ); 
    }

    // ** subscribe to signal k messages
    subscribeSignalK() {
        let aisSub = {
            "context":"vessels.*",
            "subscribe":[
                {"path":"uuid","period":10000},
                {"path":"name","period":10000},
                {"path":"communication.callsignVhf","period":10000},
                {"path":"mmsi","period":10000},
                {"path":"port","period":10000},
                {"path":"flag","period":10000},
                {"path":"navigation.position","period":10000},
                {"path":"navigation.state","period":10000},
                {"path":"navigation.courseOverGround*","period":10000},
                {"path":"navigation.speedOverGround","period":10000}
            ]
        };
        let selfSub = {
            "context":"vessels.self",
            "subscribe":[
                {"path":"navigation.position","period":1000},
                {"path":"navigation.state","period":1000},
                {"path":"navigation.courseOverGroundTrue*","period":1000},
                {"path":"navigation.speedOverGround","period":1000},
                {"path":"navigation.headingMagnetic","period":1000},
                {"path":"navigation.headingTrue","period":1000},
                {"path":"navigation.course.activeRoute.href","period":1000},
                {"path":"navigation.anchor","period":1000},
                {"path":"environment.wind.directionTrue","period":1000},
                {"path":"environment.wind.angleApparent","period":1000},
                {"path":"environment.wind.speedTrue","period":1000},
                {"path":"environment.wind.speedApparent","period":1000},
                {"path":"notifications.*","period":1000}
            ]
        };        
        this.signalk.send(aisSub);
        this.signalk.send(selfSub);
    } 

    // ******** Signal K Event handlers **************

    // ** handle connection established
    onConnect(e) {
        console.info('Connected to Signal K server...');
        // ** subscribe to messages 
        this.subscribeSignalK();
        // ** query for resources
        this.skres.getRoutes();
        this.skres.getWaypoints();
        this.skres.getCharts();
        // ** query navigation status
        this.signalk.apiGet('/vessels/self/navigation').subscribe(
            r=> {
                if(r['course'] && r['course']['activeRoute'] && 
                    r['course']['activeRoute']['href']) { 
                    this.processActiveRoute( r['course']['activeRoute']['href'].value );
                }                
            },
            e=> { this.app.debug('No navigation data available!') }
        ); 
        // ** query anchor alarm status
        this.getAnchorStatus();

        // ** get vessel details
        this.signalk.apiGet('vessels/self').subscribe(
            r=> {  
                this.display.vessels.self.mmsi= (r['mmsi']) ? r['mmsi'] : null;
                this.display.vessels.self.name= (r['name']) ? r['name'] : null;
            },
            e=> { this.app.debug('No vessel data available!') }
        );   
        
        // ** start trail logging interval timer
        this.trailTimer= setInterval( ()=> { this.processTrail() }, 5000 );        
    }

    // ** handle connection closure
    onClose(e) {
        console.info('Closing connection to Signal K server...');
        this.terminateSignalK();
        if(this.trailTimer) { clearInterval(this.trailTimer) }
        let dRef= this.dialog.open(AlertDialog, {
            disableClose: false,
            data: {
                title: 'Connection Closed:',  
                message: 'Connection to the Signal K server has been closed.', 
                buttonText: 'Re-connect'
            }
        });  
        dRef.afterClosed().subscribe( ()=>{ this.initSignalK() } );        
    }
    
    // ** handle error message
    onError(e) { console.warn(e) }
    
    // ** handle delta message received
    onMessage(e) { 
        // ** process message **
        this.skdata.parse(e);

        // ** display received data **
        this.app.data.vessels.forEach( (value, key)=> {

            let v= this.skdata.getVesselData(value, key);
            if(v.id=='self') {
                // ** set preferred heading true / magnetic ** 
                let ph =this.app.config.selections.headingAttribute.split('.');
                if( ph[1]=='headingTrue' && v.headingTrue) { v.heading= v.headingTrue }
                else if( ph[1]=='headingMagnetic' && v.headingMagnetic) { v.heading= v.headingMagnetic } 
                else { v.heading= v.headingTrue ? v.headingTrue : 
                        v.headingMagnetic ? v.headingMagnetic : 0 }
                // ** preserve non delta values
                v.name= this.display.vessels.self.name;
                v.mmsi= this.display.vessels.self.mmsi;
                this.display.vessels.self= v;             

                // ** active route **
                if( value['navigation.course.activeRoute.href'] ) {
                    this.processActiveRoute( value['navigation.course.activeRoute.href'] );
                }   
                
                // ** alarms **
                if( this.app.config.depthAlarm.enabled) {
                    if( value['notifications.environment.depth.belowTransducer'] ) {
                        this.processAlarm(
                            'Depth',
                            value['notifications.environment.depth.belowTransducer']
                        );
                    }
                    if( value['notifications.environment.depth.belowSurface'] ) {
                        this.processAlarm(
                            'Depth',
                            value['notifications.environment.depth.belowSurface']
                        );
                    }
                    if( value['notifications.environment.depth.belowKeel'] ) {
                        this.processAlarm(
                            'Depth', 
                            value['notifications.environment.depth.belowKeel']
                        );
                    }                                        
                }
                if( value['notifications.anchorAlarm'] ) {
                    this.processAlarm(
                        'Anchor', 
                        value['notifications.anchorAlarm']
                    );
                }    
                
                // ** update map display **
                this.mapVesselLines();
                if(this.app.config.map.moveMap) {
                    this.display.map.center= this.display.vessels.self.position;
                }
                this.mapRotate(); 

            }
            else { this.display.vessels.aisTargets.push(v) }

            //console.table(this.app.data.vessels.get(this.app.data.selfId));
        });
 
    }   
    
    // ** process alarm / notification **
    processAlarm(id, av) {
        if(av.state!=='normal') {
            if( !this.display.alarms.has(id) ) {    // create alarm entry
                this.display.alarms.set(id, {
                    sound: (av.method.indexOf('sound')!=-1) ? true : false,
                    visual: (av.method.indexOf('visual')!=-1) ? true : false,
                    state: av.state,
                    message: av.message
                });
            }
            else {  // update alarm entry
                let a= this.display.alarms.get(id);
                a.state= av.state;
                a.message= av.message;
            }  
        }
        else { // alarm returned to normal state
            let a= (this.display.alarms.has(id)) ? this.display.alarms.get(id) : null;
            if( a && a.acknowledged && !this.depthAlarmSmoothing ) { 
                this.depthAlarmSmoothing=true;
                setTimeout( ()=> {
                    this.depthAlarmSmoothing=false;
                    this.display.alarms.delete(id);
                }, this.app.config.depthAlarm.smoothing);
            }
        }
    }

    // ** process active route information **
    processActiveRoute(value) {
        let a= value.split('/');
        this.app.data.activeRoute= a[a.length-1];        
        this.app.data.routes.forEach( i=> {
            i[3]= (i[0]==this.app.data.activeRoute) ? true : false;
        }); 
    }

    // ** process vessel trail **
    processTrail() {
        // ** update vessel trail **
        let t= this.app.data.trail.slice(-1);
        if(t.length==0) { 
            this.app.data.trail.push(this.display.vessels.self.position);
            return;
        }
        if( this.display.vessels.self.position[0]!=t[0][0] ||
                this.display.vessels.self.position[1]!=t[0][1] ) {
            this.app.data.trail.push(this.display.vessels.self.position) 
        }
        let vt= this.app.data.trail.slice(-5000);
        this.app.data.trail= vt;     
    }

}
