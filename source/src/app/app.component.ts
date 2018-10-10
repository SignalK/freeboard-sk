import { Component } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import { AppInfo } from './app.info';
import { MsgBox, AboutDialog, ConfirmDialog, AlertDialog } from './lib/app-ui';
import { ResourceDialog } from './lib/ui/resource-dialogs';
import { PlaybackDialog } from './lib/ui/playback-dialog';
import { SettingsDialog } from './pages';
import { GPXImportDialog } from './lib/gpxload/gpxload.module';

import { SignalKClient } from 'signalk-client-angular';
import { SKResources, SKWaypoint, SKVessel } from './lib/sk-resources';
import { Convert } from './lib/convert';
import { GeoUtils } from './lib/geoutils';

import 'hammerjs';
import { proj, coordinate, style } from 'openlayers';
declare var UUIDjs: any;

enum APP_MODE { REALTIME=0, PLAYBACK }

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

    public display= {
        badge: { hide: true, value: '!'},
        leftMenuPanel: false,
        routeList: false,
        waypointList: false,
        chartList: false,
        anchorWatch: false,
        vessels: { 
            self: new SKVessel(), 
            aisTargets: new Map()
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

    // ** APP features / mode **
    public features= { historyAPI: null }
    public mode: APP_MODE= APP_MODE.REALTIME;   // current mode
    private connectMode= APP_MODE.REALTIME;     // connection attempt mode

    private subOnConnect;
    private subOnError;
    private subOnMessage;
    private subOnClose

    private lastInstUrl: string;
    public instUrl: SafeResourceUrl;
    public coord;

    private watchDog;       // ** settings watchdog timer
    private isDirty: boolean=false;

    private depthAlarmSmoothing: boolean= false;
    private trailTimer;     // ** timer for logging vessel trail
    private aisTimer;       // ** AIS target manager
    public aisMgr= {
        maxAge: 540000,        // time since last update in ms (9 min)
        staleAge: 360000,        // time since last update in ms (6 min)
        lastTick: new Date().valueOf(),
        updateList: [],
        staleList: [],
        removeList: []
    }

    constructor(
        public app: AppInfo,
        private dom: DomSanitizer,
        public signalk: SignalKClient,
        public skres: SKResources,
        private dialog: MatDialog) { 
            this.lastInstUrl= this.app.config.plugins.instruments;
            this.instUrl= dom.bypassSecurityTrustResourceUrl(`${this.app.host}${this.app.config.plugins.instruments}`);
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
        });           
    } 

    ngOnDestroy() {
        // ** clean up
        this.terminateSignalK();
        if(this.watchDog) { clearInterval(this.watchDog) }
        if(this.trailTimer) { clearInterval(this.trailTimer) }
        if(this.aisTimer) { clearInterval(this.aisTimer) }
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
    openSettings() {  this.dialog.open( SettingsDialog, { disableClose: false }) }      

    // ** alert message
    showAlert(title, message) {
        let dref= this.dialog.open(AlertDialog, {
            disableClose: false,
            data: { message: message, title: title }
        });         
    }

    // ** show welcome message on first run **
    showWelcome() {
        let title: string= 'Welcome to Freeboard';
        let message: string;
        if(this.app.data.server.id=='signalk-server-node') {
            message='Node version of Signal K server detected!\n\n';
            message+='For all Freeboard features to operate ensure the server has plugins ';
            message+='that can service the following Signal K API paths:\n';
            message+='- resources/routes, resources/waypoints\n';
            message+='- resources/charts\n';
            message+='- navigation/anchor, navigation/course/activeRoute';
        }
        else {
            message='- View Routes, Waypoints and Charts available on your Signal K server\n';
            message+='- Add, delete and manage Routes and Waypoints\n';
            message+='- Set Anchor Watch alarms and display Depth alarms\n';
        }
        this.app.data['firstRun']=false;
        let dref= this.dialog.open(MsgBox, {
            disableClose: true,
            data: { message: message, title: title, buttonText: 'Continue' }
        });         
    }

    // ** show select mode dialog
    showSelectMode() {
        if(this.mode== APP_MODE.REALTIME) { // request history playback
            this.dialog.open(ConfirmDialog, {
                disableClose: true,
                data: { 
                    message: 'Do you want to change to History Playback mode?', 
                    title: 'Switch Mode' 
                }
            }).afterClosed().subscribe( r=> {
                if(r) { this.showPlaybackSettings() }
            });         
        }
        else {  // request realtime
            this.dialog.open(ConfirmDialog, {
                disableClose: true,
                data: { 
                    message: 'Do you want to exit History Playback mode?', 
                    title: 'Exit History Playback' 
                }
            }).afterClosed().subscribe( r=> {
                if(r) { this.switchMode(APP_MODE.REALTIME) }
            });  
        }
    }

    showPlaybackSettings() {
        this.dialog.open(PlaybackDialog, {
            disableClose: false
        }).afterClosed().subscribe( r=> {
            if(r.result) { // OK
                this.switchMode(APP_MODE.PLAYBACK, r.query);
                // ** test for history provider / available time data
                /*this.signalk.apiGet(`vessels/self/navigation/position?time=${r.startTime}`)
                .subscribe( 
                    res=> { this.switchMode(APP_MODE.PLAYBACK, r.query) },
                    err=> { this.showAlert('Error:', 'Cannot enter History Playback mode.\n\n' + err.error) }
                ); */
            }
            else {  // cancel: restarts realtime mode
                if(this.mode==APP_MODE.PLAYBACK) { this.initSignalK() }
            }
        });
    }

    // **********  GPX File processing **********
    processGPX(e) {
        let dref= this.dialog.open(GPXImportDialog, {
            disableClose: true,
            data: { 
                fileData: e.data,
                fileName: e.name
            }
        });     
        dref.afterClosed().subscribe( res=> {
            if(!res) { return }
            let subCount=0;
            let errCount=0;
            res.routes.forEach( rte=> {
                subCount++;
                if(this.app.config.usePUT) {
                    this.signalk.apiPut('self',`/resources/routes`, rte[0], rte[1])
                    .subscribe( 
                        r=> { 
                            if(r['state']=='COMPLETED') { 
                                this.app.debug('SUCCESS: Route added.');
                                this.app.config.selections.routes.push(rte[0]);                        
                            }
                            else { errCount++ }
                            subCount--;
                            if(subCount==0) { this.gpxResult(errCount) }
                        },
                        e=> { 
                            errCount++; subCount--; 
                            if(subCount==0) { this.gpxResult(errCount) }
                        }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `/resources/routes/${rte[0]}`, rte[1]);
                    if(subCount==res.waypoints.length + res.routes.length) { 
                        this.gpxResult(errCount);
                    }
                }
            });

            res.waypoints.forEach( wpt=> {
                subCount++;            
                if(this.app.config.usePUT) {
                    this.signalk.apiPut('self',`/resources/waypoints`, wpt[0], wpt[1])
                    .subscribe( 
                        r=>{ 
                            if(r['state']=='COMPLETED') { 
                                this.app.debug('SUCCESS: Waypoint added.');
                                this.app.config.selections.waypoints.push(wpt[0]);
                            }
                            else { errCount++ }
                            subCount--;
                            if(subCount==0) { this.gpxResult(errCount) }
                        },
                        e=> { 
                            errCount++; subCount--; 
                            if(subCount==0) { this.gpxResult(errCount) }
                        }
                    );
                }
                else { 
                    this.signalk.sendUpdate('self', `resources.waypoints.${wpt[0]}`, wpt[1]);
                    if(subCount==res.waypoints.length + res.routes.length) { 
                        this.gpxResult(errCount);
                    }
                }
            });
        });         
    }

    gpxResult(errCount) {
        this.skres.getRoutes();
        this.skres.getWaypoints();
        this.app.saveConfig();       
        if(errCount==0) { this.showAlert('GPX Load','GPX file resources loaded successfully.') }
        else { this.showAlert('GPX Load','Completed with errors!\nNot all resources were loaded.') }
    }

    // ********** MAP EVENTS *****************
    
    mapDragOver(e) { e.preventDefault() }

    // ** handle drag and drop of files onto map container**
    mapDrop(e) {  
        e.preventDefault();
        if (e.dataTransfer.files) {
            if( e.dataTransfer.files.length>1 ) { 
                this.showAlert('Load Resources', 'Multiple files provided!\nPlease select only one file for processing.');
            }
            else {
                let reader = new FileReader();
                reader.onerror= err=> { 
                    this.showAlert('File Load error', `There was an error reading the file contents!`);
                }  
                if(!e.dataTransfer.files[0].name) { return }  
                let fname= e.dataTransfer.files[0].name;            
                reader.onload= ()=> { this.processGPX({ name: fname, data: reader.result}) }
                reader.readAsText(e.dataTransfer.files[0]);
            }
        } 
    }     

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
    
    mapPointerDrag(e) { this.app.config.map.moveMap=false }

    mapPointerMove(e) {
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
    
    // ****** MAP functions *******
    mapRotate() {
        if(this.app.config.map.northUp) { this.display.map.rotation=0 }
        else { this.display.map.rotation= 0-this.display.vessels.self.heading }
    }

    mapMove() { 
        let t=this.display.vessels.self.position;
        t[0]+=0.0000000000001;
        this.display.map.center= t;
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

    toggleAisTargets() { 
        this.app.config.aisTargets= !this.app.config.aisTargets;
        if(this.app.config.aisTargets) { this.processAIS(true) }
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
            case 'ais-vessels':
                let aid= id.slice(4);
                if(!this.display.vessels.aisTargets.has(aid)) {return false }
                item= this.display.vessels.aisTargets.get(aid);
                this.display.overlay['type']='ais';
                this.display.overlay['id']= aid;
                this.display.overlay['showProperties']=false;
                this.display.overlay.title= 'AIS';    
                info= this.compileAISInfo(item);
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
                info.push(['Latitude', item[0][1]['position']['latitude'].toFixed(6)]); 
                info.push(['Longitude', item[0][1]['position']['longitude'].toFixed(6)]);    
                this.display.overlay['id']=t[1];             
                break;       
        }
        this.display.overlay.content= info;
        return true;
    }

    // ** return AIS vessel info for popover **
    compileAISInfo(item) {
        let info=[];
        info.push(['Name', item.name]); 
        info.push(['MMSI', item.mmsi]);  
        info.push(['Call Sign', item.callsign]);    
        info.push(['State', item.state]); 
        if(item.position) {
            info.push(['Latitude', item.position[1].toFixed(6) ]); 
            info.push(['Longitude', item.position[0].toFixed(6) ]);  
        } 
        info.push(['SOG', (item.sog ? Convert.msecToKnots(item.sog).toFixed(1) : '0.0') + ' kn']);
        info.push(['COG', (item.cogTrue ? Convert.radiansToDegrees(item.cogTrue).toFixed(1) : '0.0') + String.fromCharCode(186)]);
        return info;    
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
        if(this.app.config.usePUT) {
            this.signalk.apiPut('self', 'navigation/course/activeRoute/href', `/resources/routes/${e.id}`)
            .subscribe( 
                r=> {
                    this.signalk.apiPut('self', 'navigation/course/activeRoute/startTime', dt.toISOString())
                    .subscribe( 
                        r=> { this.app.debug('Route activated') },
                        e=> { this.showAlert('ERROR:', 'Server could not Activate Route!') }
                    );
                },
                e=> { this.showAlert('ERROR:', 'Server could not Activate Route!') }
            );
        }
        else {
            this.signalk.sendUpdate('self', 'navigation.course.activeRoute.href', `/resources/routes/${e.id}`);
            this.signalk.sendUpdate('self', 'navigation.course.activeRoute.startTime', dt.toISOString());
        }
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
                                this.submitWaypoint(res['wptStart'][0], res['wptStart'][1], false);
                                this.submitWaypoint(res['wptEnd'][0], res['wptEnd'][1], false);               
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
                    this.submitWaypoint(res['wptStart'][0], res['wptStart'][1], false);
                    this.submitWaypoint(res['wptEnd'][0], res['wptEnd'][1], false);               
                    
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

    // ** return local charts sorted by scale descending.
    chartsLocalByScale() {
        let c= (this.app.data.charts.length>2) ? this.app.data.charts.slice(2) : [];
        // ** sort local maps by scale descending
        c.sort( (a,b)=> { return b[1].scale > a[1].scale ? 1 : -1 } );
        return c;
    }

    // ******** Anchor Watch EVENTS ************
    anchorEvent(e) {
        if(e.action=='radius') {
            this.app.config.anchor.radius= e.radius;            
            this.signalk.apiPut('self', '/navigation/anchor/maxRadius', 
                this.app.config.anchor.radius
            ).subscribe(
                r=> { this.getAnchorStatus() },
                err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
            );           
            /*
            if(!this.app.data.server.id=='signalk-server-node') {
                this.signalk.send({ 
                    context: 'vessels.self',
                    put: [{
                        timestamp: new Date().toISOString(),
                        source: this.app.id,
                        values: [{
                            path: 'navigation.anchor.maxRadius',
                            value: this.app.config.anchor.radius
                        }]   
                    }]
                });
            }
            */        
            return;
        }
        if(!e.raised) {  // ** drop anchor
            this.app.config.anchor.raised= false;
            this.app.config.anchor.position= this.display.vessels.self.position;
            this.signalk.apiPut('self','/navigation/anchor/position', 
                {
                    latitude: this.app.config.anchor.position[1],
                    longitude: this.app.config.anchor.position[0]
                }
            ).subscribe(
                r=> { 
                    this.signalk.apiPut('self', '/navigation/anchor/maxRadius', 
                        this.app.config.anchor.radius
                    ).subscribe(
                        r=> { this.getAnchorStatus() },
                        err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
                    ); 
                 },
                err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
            );             
            /*
            if(!this.app.data.server.id=='signalk-server-node') {
                this.signalk.send({ 
                    context: 'vessels.self',
                    put: [{
                        timestamp: new Date().toISOString(),
                        source: this.app.id,
                        values: [
                            {
                                path: 'navigation.anchor.position',
                                value: {
                                    latitude: this.app.config.anchor.position[1],
                                    longitude: this.app.config.anchor.position[0],
                                    altitude: 0
                                }
                            },
                            {
                                path: 'navigation.anchor.maxRadius',
                                value: this.app.config.anchor.radius
                            },
                            {
                                path: 'navigation.anchor.state',
                                value: 'on'
                            }
                        ]
                    }]
                });
            }
            */                             
        }
        else {  // ** raise anchor
            this.app.config.anchor.raised= true;
            this.signalk.apiPut('self', '/navigation/anchor/position', null ).subscribe(
                r=> { this.getAnchorStatus() },
                err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
            );             
            /*
            if(!this.app.data.server.id=='signalk-server-node') {
                this.signalk.send({ 
                    context: 'vessels.self',
                    put: [{
                        timestamp: new Date().toISOString(),
                        source: this.app.id,
                        values: [{
                            path: 'navigation.anchor.state',
                            value: 'off'
                        }]
                    }]
                }); 
            }
            */ 
        }
    }

    // ** query anchor status
    getAnchorStatus() {
        this.app.debug('Retrieving anchor status...');
        this.signalk.apiGet('/vessels/self/navigation/anchor').subscribe(
            r=> {
                this.app.debug(r);
                if(r['position'] && r['position']['value']) {
                    let p= r['position']['value'];
                    if(typeof p.latitude!= 'undefined' && typeof p.longitude!= 'undefined') {
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

    // ** process anchor watch errors
    parseAnchorError(e) {
        this.app.debug(e); 
        let errText=`Reported error:\n${e.error || e.statusText}`;
        if(e.status && e.status!=200) { 
            let errText= 'Server returned an error. This function may not be supported by yor server.';
            this.showAlert('Anchor Watch:', errText);
            return false;
        }  
        else { return true }      
    }

    // ******** Alarm EVENTS ************
    muteAlarm(id) { this.display.alarms.get(id)['muted']=true }

    acknowledgeAlarm(id) { this.display.alarms.get(id)['acknowledged']=true }
 
    
    // ******** SIGNAL K *************
    
    // ** initialise and connect to signalk server
    initSignalK(query?) {
        this.app.data.selfId= null;
        this.app.data.server= null;
        this.subOnConnect= this.signalk.onConnect.subscribe( e=> { this.onConnect(e)} );
        this.subOnError= this.signalk.onError.subscribe( e=> { this.onError(e)} );
        this.subOnMessage= this.signalk.onMessage.subscribe( e=> { this.onMessage(e)} );
        this.subOnClose= this.signalk.onClose.subscribe( e=> { this.onClose(e)} );
        if(query && query.indexOf('startTime')!=-1) { this.connectMode= APP_MODE.PLAYBACK }
        else { this.connectMode= APP_MODE.REALTIME }
        this.connectSignalKServer(query);
    }

    // ** tear down connection 
    terminateSignalK() {
        this.subOnConnect.unsubscribe();
        this.subOnError.unsubscribe();
        this.subOnMessage.unsubscribe();
        this.subOnClose.unsubscribe();      
        this.signalk.disconnect();
    }    

    // ** establish connection to server
    connectSignalKServer(query='none') {
        this.signalk.hello(this.app.hostName, this.app.hostPort, this.app.hostSSL)
        .subscribe(
            res=> {
                this.setFeatures(res['server']);
                if(this.app.data['firstRun']) { this.showWelcome() }
                this.signalk.connect( this.app.hostName, this.app.hostPort, this.app.hostSSL, query);
            },
            err=> {
                let dRef= this.dialog.open(AlertDialog, {
                    disableClose: true,
                    data: {
                        title: 'Connection Error:',  
                        message: 'Unable to contact Signal K server!', 
                        buttonText: 'Try Again'
                    }
                });  
                dRef.afterClosed().subscribe( ()=>{ this.connectSignalKServer(query) } );
            }
        ) 
    }

    // ** subscribe to signal k messages
    subscribeSignalK() {
        let selfPolicy='fixed';
        let aisSub = {
            "context":"vessels.*",
            "subscribe":[
                {"path":"uuid","period":10000,"policy":selfPolicy},
                {"path":"name","period":10000,"policy":selfPolicy},
                {"path":"communication.callsignVhf","period":10000,"policy":selfPolicy},
                {"path":"mmsi","period":10000,"policy":selfPolicy},
                {"path":"port","period":10000,"policy":selfPolicy},
                {"path":"flag","period":10000,"policy":selfPolicy},
                {"path":"navigation.position","period":10000,"policy":selfPolicy},
                {"path":"navigation.state","period":10000,"policy":selfPolicy},
                {"path":"navigation.courseOverGround*","period":10000,"policy":selfPolicy},
                {"path":"navigation.speedOverGround","period":10000,"policy":selfPolicy}
            ]
        };
        let selfSub = {
            "context":"vessels.self",
            "subscribe":[
                {"path":"navigation.*","period":1000,"policy":selfPolicy},
                {"path":"environment.wind.*","period":1000,"policy":selfPolicy},
                {"path":"notifications.*","period":1000}
            ]
        };      
        this.signalk.send(aisSub);
        this.signalk.send(selfSub);
    } 

    // ******** SIGNAL K Event handlers **************

    // ** handle connection established
    onConnect(e) {
        console.info('Connected to Signal K server...');
        // ** subscribe to messages if not history playback
        if(this.mode== APP_MODE.REALTIME) { this.subscribeSignalK() }
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
        
        // ** AIS target manager
        this.aisTimer= setInterval( ()=> { this.processAIS() }, 5000);
    }

    // ** handle connection closure
    onClose(e) {
        console.info('Closing connection to Signal K server...');
        this.terminateSignalK();
        let data= { title: 'Connection Closed:', buttonText: 'Re-connect', message: ''};
        if(this.connectMode== APP_MODE.PLAYBACK) {
            data.buttonText= 'OK'
            data.message= 'Unable to open Playback connection.\n\nClick OK to re-connect to Data Stream.';
        }
        else {
            data.message= 'Connection to the Signal K server has been closed.';            
        }
        this.dialog.open(AlertDialog, { disableClose: true, data: data })
        .afterClosed().subscribe( ()=>{ 
            if(this.mode==APP_MODE.REALTIME) { this.initSignalK() }
            else { this.showPlaybackSettings() }
        });
        if(this.trailTimer) { clearInterval(this.trailTimer) }      
        if(this.aisTimer) { clearInterval(this.aisTimer) }  
    }
    
    // ** handle error message
    onError(e) { console.warn(e) }
    
    // ** handle delta message received
    onMessage(e) { 
        if(!e.context && e.self) {
            this.connectMode= null;
            if(e.startTime) { this.mode= APP_MODE.PLAYBACK }
            else { this.mode= APP_MODE.REALTIME }
            this.app.data.selfId= e.self;
            return;
        }
        e.updates.forEach( u=> {
            u.values.forEach( v=> {
                if(e.context== this.app.data.selfId) { this.displayVesselSelf(v) }
                else { this.displayVesselOther(e.context, v) }
            });
        });   
    }   

    displayVesselSelf(v) {
        let d= this.display.vessels.self;
        let updateVlines= true;

        if( v.path=='navigation.headingTrue' ) { d.headingTrue= v.value } 
        if( v.path=='navigation.headingMagnetic' ) { d.headingMagnetic= v.value }   
        // ** set preferred heading true / magnetic ** 
        if( v.path==this.app.config.selections.headingAttribute ) {
            d.heading= v.value;
        }  
        if( v.path=='navigation.position') {
            d.position= [ v.value.longitude, v.value.latitude];
            // ** move map
            if(this.app.config.map.moveMap) {
                this.display.map.center= d.position;
            } 
            // ** locate vessel popover
            if(this.display.overlay.show && this.display.overlay['type']=='vessel') { 
                this.display.overlay.position= d.position 
            }                       
        }
        if(v.path=='navigation.courseOverGroundTrue') { d.cogTrue= v.value }
        if(v.path=='navigation.speedOverGround') { d.sog= v.value }
        if(v.path=='navigation.state') { d.state= v.value; updateVlines= false; }
        if(v.path=='environment.wind.directionTrue') { d.wind.twd= v.value }
        if(v.path=='environment.wind.speedTrue') { d.wind.tws= v.value }
        if(v.path=='environment.wind.angleApparent') { d.wind.awa= v.value }
        if(v.path=='environment.wind.speedApparent') { d.wind.aws= v.value }
        if(v.path=='communication.callsignVhf') { d.callsign= v.value; updateVlines= false; }

        // ** update map display **
        if( updateVlines) { this.mapVesselLines() }
        this.mapRotate(); 

        // ** active route **
        if(v.path=='navigation.course.activeRoute.href') {
            this.processActiveRoute(v.value);
        }   

        // ** alarms **
        if( this.app.config.depthAlarm.enabled) {
            if(v.path=='notifications.environment.depth.belowTransducer') {
                this.processAlarm('Depth', v.value);
            }
            if(v.path=='notifications.environment.depth.belowSurface') {
                this.processAlarm('Depth', v.value);
            }
            if(v.path=='notifications.environment.depth.belowKeel') {
                this.processAlarm('Depth', v.value);
            }                                        
        }
        if(v.path=='notifications.navigation.anchor') {
            this.processAlarm('Anchor', v.value);
        }                   
    }

    displayVesselOther(id, v) {
        if( !this.display.vessels.aisTargets.has(id) ) {
            let vessel= new SKVessel();
            vessel.position= null;
            this.display.vessels.aisTargets.set(id, vessel );
        }
        let d= this.display.vessels.aisTargets.get(id);
        d.lastUpdated= new Date();

        if( v.path=='' ) { 
            if(typeof v.value.name!= 'undefined') { d.name= v.value.name }
            if(typeof v.value.mmsi!= 'undefined') { d.mmsi= v.value.mmsi }
        } 
        if( v.path=='navigation.headingTrue' ) { d.headingTrue= v.value } 
        if( v.path=='navigation.headingMagnetic' ) { d.headingMagnetic= v.value }   
        // ** set preferred heading true / magnetic ** 
        if( v.path==this.app.config.selections.headingAttribute ) {
            d.heading= v.value;
        }  
        if( v.path=='navigation.position') {
            d.position= [ v.value.longitude, v.value.latitude];
            // ** locate / update ais popover
            if(this.display.overlay['type']=='ais' && this.display.overlay.show 
                    && this.display.overlay['id']==id) { 
                this.display.overlay.position= d.position;
                this.compileAISInfo(d);
            }                     
        }
        if(v.path=='navigation.courseOverGroundTrue') { d.cogTrue= v.value }
        if(v.path=='navigation.speedOverGround') { d.sog= v.value }
        if(v.path=='navigation.state') { d.state= v.value }
        if(v.path=='environment.wind.directionTrue') { d.wind.twd= v.value }
        if(v.path=='environment.wind.speedTrue') { d.wind.tws= v.value }
        if(v.path=='environment.wind.angleApparent') { d.wind.awa= v.value }
        if(v.path=='environment.wind.speedApparent') { d.wind.aws= v.value }
        if(v.path=='communication.callsignVhf') { d.callsign= v.value }        
    }

    // ** process / cleanup AIS targets
    processAIS(toggled?) {
        if(!this.app.config.aisTargets && !toggled) { return }
        let now= new Date().valueOf();
        this.aisMgr.staleList= [];
        this.aisMgr.updateList= [];
        this.aisMgr.removeList= [];
        this.display.vessels.aisTargets.forEach( (v,k)=>{
            //if not present then mark for deletion
            if(v.lastUpdated< (now-this.aisMgr.maxAge) ) {
                this.aisMgr.removeList.push(k);
            }              
            if(toggled) { // ** re-populate list after hide
                if(v.lastUpdated< (now-this.aisMgr.staleAge) ) {
                    this.aisMgr.staleList.push(k);
                }                
                else { this.aisMgr.updateList.push(k) }
            }
            else {  
                //if stale then mark inactive
                if(v.lastUpdated< (now-this.aisMgr.staleAge) ) {
                    this.aisMgr.staleList.push(k);
                }                         
                //if recently updated
                if(v.lastUpdated.valueOf()>=this.aisMgr.lastTick ) {
                    this.aisMgr.updateList.push(k);
                } 
            }           
        });   
        this.aisMgr.lastTick= now;
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
        if(!this.app.config.vesselTrail) { return }
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
        this.app.data.trail= this.app.data.trail.slice(-5000);  
        let trailId= (this.mode==APP_MODE.PLAYBACK) ? 'history' : 'self';
        this.app.db.saveTrail(trailId, this.app.data.trail);
    }

    // ** delete vessel trail **
    clearTrail() {
        let dref= this.dialog.open(ConfirmDialog, {
            disableClose: true,
            data: { 
                title: 'Clear Vessel Trail',
                message: 'Do you want to delete the vessel trail?'
            }
        });     
        dref.afterClosed().subscribe( res=> { if(res) this.app.data.trail=[] });    
    }

    // ** set available features
    setFeatures(res) {
        if(!res) { return }
        this.app.data.server= res;
        this.app.debug(this.app.data.server);
        let ver= this.app.data.server.version.split('.');

        //this.features.historyAPI= (res.id=='signalk-server-node' && ver[0]>=1 && ver[1]>=6) ? true : false;
        //this.app.debug(this.features);
    }

    // ** switch between realtime and history playback modes
    switchMode(toMode: APP_MODE, query?) {
        this.terminateSignalK();
        if(toMode== APP_MODE.PLAYBACK) { // ** history playback
            this.app.db.saveTrail('self', this.app.data.trail);
            this.app.data.trail= [];
        }
        else {  // ** realtime data
            query='none';
            this.app.db.getTrail('self').then( t=> { 
                this.app.data.trail= (t && t.value) ? t.value : [];
            });
        }
        this.initSignalK(query);
    }

}
