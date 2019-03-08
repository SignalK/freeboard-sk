import { Component } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import { AppInfo } from './app.info';
import { MsgBox, AboutDialog, ConfirmDialog, AlertDialog, LoginDialog } from './lib/app-ui';
import { PlaybackDialog } from './lib/ui/playback-dialog';
import { AlarmsDialog } from './lib/ui/alarms';
import { SettingsDialog } from './pages';
import { GPXImportDialog } from './lib/gpxload/gpxload.module';

import { SignalKClient, Alarm, AlarmState } from 'signalk-client-angular';
import { SKResources, SKWaypoint, SKVessel, SKNote,
        ResourceDialog, AISPropertiesDialog, NoteDialog  } from './lib/skresources/';
import { Convert } from './lib/convert';
import { GeoUtils } from './lib/geoutils';

import 'hammerjs';
import { proj, coordinate, style } from 'openlayers';

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
        noteList: false,
        region: { show:false, boundary: [] },        
        aisList: false,
        anchorWatch: false,
        showSelf: false,
        navData: {
            vmg: null,
            dtg: null,
            ttg: null,
            bearing: {value: null, type: null},
            bearingTrue: null,
            bearingMagnetic: null,
            xte: null,
            position: [null, null],
            pointIndex: -1,
            pointTotal: 0
        },
        vessels: { 
            self: new SKVessel(), 
            aisTargets: new Map()
        },
        alarms: new Map(),
        map: { center: [0,0], rotation: 0, minZoom: 1, maxZoom:28, vesselRotation: 0 },        
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
        },
        playback: { time: null },
        onCloseWarning: { suppress: false, type: null }
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
        style: null,
        totalDistance: 0,
        coords: []
    }    

    private zoomOffsetLevel=[
        1,1000000,550000,290000,140000,70000,
        38000,17000,7600,3900,1900,
        950,470,250,120,60,
        30,15.5,8.1,4,2,
        1,.5,.25,.12,.06,
        .03,.015,.008,1
    ]    

    // ** APP features / mode **
    public features= { playbackAPI: null }
    public mode: APP_MODE= APP_MODE.REALTIME;   // current mode

    private subscriptions= [];
    private timers= [];

    private lastInstUrl: string;
    public instUrl: SafeResourceUrl;
    public coord;

    private watchDog;       // ** settings watchdog timer
    private isDirty: boolean=false;
    private depthAlarmSmoothing: boolean= false;

    public aisMgr= {
        maxAge: 540000,        // time since last update in ms (9 min)
        staleAge: 360000,        // time since last update in ms (6 min)
        lastTick: new Date().valueOf(),
        updateList: [],
        staleList: [],
        removeList: []
    }

    public convert= Convert;

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
            // ** handle settings load / save events to manage True/magnetic values
            this.app.settings$.subscribe( r=> {
                if(r.action=='load' && r.setting=='config') {
                    this.app.data.trueMagChoice= this.app.config.selections.headingAttribute;
                }
                if(r.action=='save' && r.setting=='config') {
                    if(this.app.data.trueMagChoice!= this.app.config.selections.headingAttribute) {
                        this.app.debug('True / Magnetic selection changed..');
                        this.display.vessels.self.heading= this.app.useMagnetic ? 
                            this.display.vessels.self.headingMagnetic : 
                            this.display.vessels.self.headingTrue;
                        this.display.vessels.self.cog= this.app.useMagnetic ? 
                            this.display.vessels.self.cogMagnetic : 
                            this.display.vessels.self.cogTrue;
                        this.display.vessels.self.wind.direction= this.app.useMagnetic ? 
                            this.display.vessels.self.wind.mwd : 
                            this.display.vessels.self.wind.twd;

                        this.display.vessels.aisTargets.forEach( (v,k)=> {
                            v.heading= this.app.useMagnetic ? 
                                v.headingMagnetic : 
                                v.headingTrue; 
                            v.cog= this.app.useMagnetic ? 
                                v.cogMagnetic : 
                                v.cogTrue;
                            v.wind.direction= this.app.useMagnetic ? 
                                v.wind.mwd : 
                                v.wind.twd;
                        });
                        this.app.data.trueMagChoice= this.app.config.selections.headingAttribute;
                    };
                }    
            }); 
    }

    ngAfterViewInit() { if(this.app.data['firstRun']) { setTimeout( ()=> { this.showWelcome()}, 500) } }

    ngOnInit() {
        // ** apply loaded app config	
        this.display.map.center= this.app.config.map.center;
        this.display.map.rotation= this.app.config.map.rotation;
        // ** connect to signalk server and intialise
        this.subscriptions.push( this.signalk.stream.onConnect.subscribe( e=> { this.onConnect(e)} ) );
        this.subscriptions.push( this.signalk.stream.onError.subscribe( e=> { this.onError(e)} ) );
        this.subscriptions.push( this.signalk.stream.onMessage.subscribe( e=> { this.onMessage(e)} ) );
        this.subscriptions.push( this.signalk.stream.onClose.subscribe( e=> { this.onClose(e)} ) );

        this.connectSignalKServer(); 

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
        this.subscriptions.forEach( s=> s.unsubscribe() );
        this.stopTimers(true);  // all timers
        this.signalk.disconnect();
    }   
    
    // ** establish connection to server
    connectSignalKServer() {
        this.app.data.selfId= null;
        this.app.data.server= null;
        this.signalk.connect(this.app.hostName, this.app.hostPort, this.app.hostSSL)
        .then( ()=> { 
            this.app.data.server= this.signalk.server.info; 
            this.signalk.stream.open(null, 'none');
        })
        .catch( err=> {
            let dRef= this.dialog.open(AlertDialog, {
                disableClose: true,
                data: {
                    title: 'Connection Error:',  
                    message: 'Unable to contact Signal K server!', 
                    buttonText: 'Try Again'
                }
            });  
            dRef.afterClosed().subscribe( ()=>{ this.connectSignalKServer() } );
        });
    } 
    
    // ** start trail / AIS timers
    startTimers() {
        this.app.debug(`Starting timers...`);
        // ** start trail logging interval timer
        this.timers.push( setInterval( ()=> { this.processTrail() }, 5000 ) );     
        // ** AIS target manager
        this.timers.push( setInterval( ()=> { this.processAIS() }, 2000) );    
    }
    // ** stop timers
    stopTimers(all:boolean=false) {
        this.app.debug(`Stopping timers: all=${all}`);
        this.timers.forEach( t=> clearInterval(t) );
        this.timers= [];
        if(all) { clearInterval(this.watchDog) }
    }

    // ******************************************************
  
    openUrl(url:string, target:string='_blank') { window.open(url, target) }

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

    // ** display raise Alarms Dialog **
    openAlarmsDialog() {
        this.dialog.open(AlarmsDialog, {
            disableClose: false,
            data: this.display.alarms
        }).afterClosed().subscribe( r=> {
            if(!r) { return }
            if(r.raise) {
                this.signalk.stream.raiseAlarm(
                    'self', 
                    r.type, 
                    new Alarm(r.msg, AlarmState.alarm, true,true)
                )
            }
            else { this.signalk.stream.clearAlarm('self', r.type) }
        });          
    }

    actionAlarm(action:string, id:string) { 
        let alarm= this.display.alarms.get(id);
        switch(action) {
            case 'ack':
                alarm.acknowledged=true;
                break;
            case 'mute':
                alarm.muted=true;
                break;
            case 'clear':
                this.display.alarms.delete(id);
                break;
        } 
    }

    //** open settings dialog **
    openSettings() {  this.dialog.open( SettingsDialog, { disableClose: false }) }      

    // ** show login dialog **
    showLogin(message?:string, cancelWarning:boolean=true, onConnect?:boolean) {
        this.dialog.open(LoginDialog, {
            disableClose: true,
            data: { message: message || 'Login to Signal K server.'}
        }).afterClosed().subscribe( res=> {
            if(!res.cancel) {
                this.signalk.login(res.user, res.pwd).subscribe(
                    r=> {   // ** authenticated
                        this.signalk.authToken= r['token'];
                        this.app.db.saveAuthToken(r['token']);
                        this.app.data.hasToken= true; // hide login menu item
                        if(onConnect) { this.queryAfterConnect() }
                    },
                    err=> {   // ** auth failed
                        this.app.data.hasToken= false; // show login menu item
                        if(onConnect) { 
                            this.dialog.open(AlertDialog, {
                                disableClose: true,
                                data: { 
                                    message: 'Invalid Username or Password.', 
                                    title: 'Authentication Failed:',
                                    button1Text: 'Try Again'
                                }
                            }).afterClosed().subscribe( r=> { this.showLogin(null, false, true) });
                        }
                        else { 
                            this.dialog.open(ConfirmDialog, {
                                disableClose: true,
                                data: { 
                                    message: 'Invalid Username or Password.\nNote: Choosing CLOSE may make operations requiring authentication unavailable.', 
                                    title: 'Authentication Failed:',
                                    button1Text: 'Try Again',
                                    button2Text: 'Close'
                                }
                            }).afterClosed().subscribe( r=> { if(r) { this.showLogin() } }); 
                        }
                    }
                );
            }
            else { 
                this.app.data.hasToken= false; // show login menu item
                if(onConnect) { this.showLogin(null, false, true) }
                else {
                    if(cancelWarning) {
                        this.showAlert(
                            'Login Cancelled:', 
                            `Update operations are NOT available until you have authenticated to the Signal K server.`);
                    }
                }
            }
        });        
    }

    // ** display Authentication required message then login dialog
    showAuthRequired() {
        let dref= this.dialog.open(AlertDialog, {
            disableClose: true,
            data: { message: 'Signal K Server requires authentication!\n\nPlease login and then RE-TRY last operation.', title: 'Login Required' }
        }).afterClosed().subscribe( r=> { this.showLogin() });             
    } 

    // ** alert message
    showAlert(title:string, message:string) {
        let dref= this.dialog.open(AlertDialog, {
            disableClose: false,
            data: { message: message, title: title }
        });         
    }   

    // ** show welcome message on first run **
    showWelcome() {
        let title: string= 'Welcome to Freeboard';
        let message: string;
        if(this.app.data.server && this.app.data.server.id=='signalk-server-node') {
            message='Node version of Signal K server detected!\n\n';
            message+='For all Freeboard features to operate ensure the server has plugins ';
            message+='that can service the following Signal K API paths:\n';
            message+='- resources/routes, resources/waypoints\n';
            message+='- resources/charts\n';
            message+='- navigation/anchor, navigation/courseGreatCircle/activeRoute';
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
            if(r.result) { // OK: switch to playback mode
                this.switchMode(APP_MODE.PLAYBACK, r.query);
            }
            else {  // cancel: restarts realtime mode
                this.switchMode(APP_MODE.REALTIME);
            }
        });
    }

    // ** switch between realtime and history playback modes
    switchMode(toMode: APP_MODE, query:any='none') {
        this.app.debug(`switchMode from: ${this.mode} to ${toMode}`);
        if(toMode== APP_MODE.PLAYBACK) { // ** history playback
            this.app.db.saveTrail('self', this.app.data.trail);
            this.app.data.trail= [];
        }
        else {  // ** realtime data
            this.app.db.getTrail('self').then( t=> { 
                this.app.data.trail= (t && t.value) ? t.value : [];
            });
        }
        this.openSKStream(query, toMode);
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
                this.signalk.api.put('self',`/resources/routes`, rte[0], rte[1])
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
            });

            res.waypoints.forEach( wpt=> {
                subCount++;            
                this.signalk.api.put('self',`/resources/waypoints`, wpt[0], wpt[1])
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
                    err=> { 
                        errCount++; subCount--; 
                        if(subCount==0) { this.gpxResult(errCount) }
                    }
                );
            });
        });         
    }

    gpxResult(errCount:number) {
        this.skres.getRoutes();
        this.skres.getWaypoints();
        this.app.saveConfig();       
        if(errCount==0) { this.showAlert('GPX Load','GPX file resources loaded successfully.') }
        else { this.showAlert('GPX Load','Completed with errors!\nNot all resources were loaded.') }
    }

    // ********** MAP EVENTS *****************

    mapDragOver(e:any) { e.preventDefault() }

    // ** handle drag and drop of files onto map container**
    mapDrop(e:any) {  
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

    mapMoveEvent(e:any) {
        let v= e.map.getView();
        let z= Math.round(v.getZoom());
        this.app.config.map.zoomLevel=z;
        this.app.debug(`Zoom: ${z}`);

        if(!this.app.config.map.mrid) { this.app.config.map.mrid= v.getProjection().getCode() }
        let center = proj.transform(
            v.getCenter(), 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );
        this.app.config.map.center= center;

        this.mapVesselLines();
        if(!this.app.config.map.moveMap) { 
            this.app.saveConfig();
            this.isDirty=false;
        }
        else { this.isDirty=true }
    }
   
    mapMouseClick(e:any) {
        if(this.measure.enabled) {
            let c= proj.transform(
                e.coordinate,
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            this.measure.coords.push(c);
            this.display.overlay.position= c;

            let l= this.measureDistanceToAdd();
            this.measure.totalDistance+= l;
            this.display.overlay.title= (this.app.config.units.distance=='m') ? 
                `${(this.measure.totalDistance/1000).toFixed(2)} km` :
                `${Convert.kmToNauticalMiles(this.measure.totalDistance/1000).toFixed(2)} NM`              
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
    
    mapPointerDrag(e:any) { this.app.config.map.moveMap=false }

    mapPointerMove(e:any) {
        if(this.measure.enabled && this.measure.coords.length!=0) {
            let c= proj.transform(
                e.coordinate, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            this.display.overlay.position= c;  

            let l= this.measure.totalDistance + this.measureDistanceToAdd(c);
            this.display.overlay.title= (this.app.config.units.distance=='m') ? 
                `${(l/1000).toFixed(2)} km` :
                `${Convert.kmToNauticalMiles(l/1000).toFixed(2)} NM`;    
        }            
    }  
   
    // ****** MAP functions *******
    // ** handle map zoom controls 
    mapZoom(zoomIn:boolean) {
        if(zoomIn) {
            if(this.app.config.map.zoomLevel<this.display.map.maxZoom) { ++this.app.config.map.zoomLevel }
        }
        else { 
            if(this.app.config.map.zoomLevel>this.display.map.minZoom) { --this.app.config.map.zoomLevel }
        }
    }

    mapRotate() {
        if(this.app.config.map.northUp) { this.display.map.rotation=0 }
        else { 
            let h= (typeof this.display.vessels.self.heading === 'undefined') ? 
                this.display.vessels.self.cog : this.display.vessels.self.heading;
            this.display.map.rotation= 0- (h || 0); 
        }
    }

    mapMove() { 
        let t=this.display.vessels.self.position;
        t[0]+=0.0000000000001;
        this.display.map.center= t;
    }

    mapVesselLines() {
        let z= this.app.config.map.zoomLevel;
        let offset= (z<29) ? this.zoomOffsetLevel[z] : 60;
        let wMax= 10;   // ** max line length

        // ** heading line **
        let sog=(this.display.vessels.self.sog || 0);
        if(sog>wMax) { sog=wMax }
        this.display.vesselLines.heading= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                this.display.vessels.self.heading,
                sog * offset
            )
        ];

        // ** bearing line **
        let bpos= (this.display.navData.position && this.display.navData.position[0]) ? 
            this.display.navData.position : this.display.vessels.self.position;
        this.display.vesselLines.bearing= [
            this.display.vessels.self.position, 
            bpos
        ];  
        
        
        // ** awa **
        let aws= (this.display.vessels.self.wind.aws || 0);
        if(aws>wMax) { aws=wMax }

        let ca= (this.app.config.map.northup) ? 
            this.display.vessels.self.wind.awa :
            this.display.vessels.self.wind.awa + this.display.vessels.self.heading;

        this.display.vesselLines.awa= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                ca,
                (this.display.vessels.self.heading) ? aws * offset : 0
            )
        ];        
        
        // ** twd **
        let tws= (this.display.vessels.self.wind.tws || 0);
        if(tws>wMax) { tws=wMax }
        let wd= (this.app.useMagnetic) ? this.display.vessels.self.wind.mwd : this.display.vessels.self.wind.twd;
        this.display.vesselLines.twd= [
            this.display.vessels.self.position, 
            GeoUtils.destCoordinate(
                this.display.vessels.self.position[1],
                this.display.vessels.self.position[0],
                wd || 0,
                (wd) ? tws * offset : 0
            )
        ];

        // ** anchor line **
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

    toggleCourseData() { 
        this.app.config.courseData= !this.app.config.courseData;
        this.app.saveConfig();
    }  
    
    toggleNotes() { 
        this.app.config.notes= !this.app.config.notes;
        this.app.saveConfig();
    }

    popoverClosed() { 
        this.display.overlay.show= false; 
        this.display.region= {show: false, boundary:[]}; 
    }

    formatPopover(id:string, coord:any, prj:any) {
        this.display.overlay['addWaypoint']=null;  
        this.display.overlay['gotoWaypoint']=null;
        this.display.overlay['activateRoute']=null;
        this.display.overlay['id']=null;    
        this.display.overlay['type']=null;   
        this.display.overlay['showProperties']=false;
        this.display.overlay['canDelete']=null;
        this.display.overlay['url']=null;
        this.display.overlay.content=[];
        this.display.region= {show: false, boundary:[]};

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
                this.display.overlay['type']='ais';
                this.display.overlay['id']= aid;
                this.display.overlay['showProperties']=true;
                this.display.overlay.title= 'Vessel';  
                info= this.display.vessels.aisTargets.get(aid);  
                break;
            case 'note':
                item= this.app.data.notes.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.display.overlay['type']='note';
                this.display.overlay['id']= t[1];
                this.display.overlay['showProperties']=true;
                this.display.overlay.title= 'Note';  
                info.push(['Title', item[0][1].title]);
                info.push(['Desc.', (item[0][1].description) ? item[0][1].description.slice(0,47) + '...' : '']);  
                if(item[0][1].url) { this.display.overlay['url']=item[0][1].url }
                if(item[0][1].boundary) { 
                    this.display.region.show=true;
                    this.display.region.boundary=item[0][1].boundary;
                }                
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
                this.display.overlay['gotoWaypoint']=!item[0][3];
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

    // ******** DRAW / EDIT EVENTS ************

    drawStart(mode:string) {
        switch(mode) {
            case 'waypoint':
            case 'note':
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

    handleDrawEnd(e:any) {
        this.draw.enabled=false;
        let c:any;
        switch(this.draw.type) {
            case 'Point':
                c = proj.transform(
                    e.feature.getGeometry().getCoordinates(), 
                    this.app.config.map.mrid, 
                    this.app.config.map.srid
                );     
                if(this.draw.mode=='note') { this.noteUpdate({position: c}) }          
                else { this.waypointAdd({position: c}) }
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

    measureStart() { 
        this.measure.enabled=true;
        this.measure.coords= [];
        this.measure.totalDistance= 0;
    }

    handleMeasure(e:any) {
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
 
    // Returns distance from last point 
    measureDistanceToAdd(pt?:any) {
        if(pt && this.measure.coords.length>0) { // return distance between last point in array and pt
            return GeoUtils.distanceTo(
                this.measure.coords[this.measure.coords.length-1],
                pt
            );            
        }
        if(this.measure.coords.length>1) { // return distance between last two points in array
            return GeoUtils.distanceTo(
                this.measure.coords[this.measure.coords.length-2],
                this.measure.coords[this.measure.coords.length-1],
            );
        }
        else { return 0 }
    }
         
    // ******** RESOURCE EVENTS ************

    displayLeftMenu( menulist:string='', show:boolean= false) {
        this.display.leftMenuPanel= show;
        this.display.routeList= false;
        this.display.waypointList= false; 
        this.display.chartList= false;
        this.display.noteList= false;
        this.display.aisList= false;
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
            case 'noteList': 
                this.display.noteList= show;
                break;                                   
            case 'anchorWatch': 
                this.display.anchorWatch= show;
                break;    
            case 'aisList': 
                this.display.aisList= show;
                break;                                                   
            default: 
                this.display.leftMenuPanel= false;     
        }
    }

    // ** handle display resource properties **
    resourceProperties(r:any) {
        switch(r.type) {
            case 'waypoint': 
                this.waypointAdd(r);
                break;
            case 'route': 
                this.routeDetails(r);
                break; 
            case 'note':
                this.noteDetails(r);
                break;               
        }
    }

    // ** Display Note Details.
    noteDetails(r:any) {
        let na= this.app.data.notes.filter( i=> { if(i[0]==r.id) { return true } });
        let n= na[0][1];
        this.dialog.open(NoteDialog, {
            disableClose: true,
            data: { note: n, editable: false }
        }).afterClosed().subscribe( r=> {
            if(r.result) { // ** open in tab **
                if(r.data== 'url') { this.openUrl(n.url, 'note') }
                if(r.data== 'edit') { this.noteUpdate({id: na[0][0]}) }
            }
        });
    }

    // ** Add / Edit Note entry
    noteUpdate(e:any=null) {      
        let resId= null; 
        let title: string;
        let note: SKNote;
        let addMode: boolean=true;

        if(!e) { return }
        if(!e.id && e.position) { // add note at provided position
            if(this.app.config.resources.notes.extAdd) {
                let url:any= this.dom.bypassSecurityTrustResourceUrl(`${this.app.config.resources.notes.extAdd}${e.id}`);
                url=this.app.config.resources.notes.extAdd;
                this.openUrl( url, 'extedit' );
                return;
            }
            note= new SKNote(); 
            note.position= {latitude: e.position[1], longitude: e.position[0]};    
            title= 'Add Note:';      
            note.title= '';
            note.description= '';
        }
        else { // edit selected note details
            if(this.app.config.resources.notes.extEdit) {
                let url:any= this.dom.bypassSecurityTrustResourceUrl(`${this.app.config.resources.notes.extEdit}${e.id}`);
                url=this.app.config.resources.notes.extEdit;
                this.openUrl( url, 'extedit' );
                return;
            }            
            resId= e.id;
            title= 'Note Details:'; 
            let n= this.app.data.notes.filter( i=>{ if(i[0]==resId) return true });
            if(n.length==0) { return }
            note= JSON.parse( JSON.stringify(n[0][1]) );
            addMode=false;
        }

        this.dialog.open(NoteDialog, {
            disableClose: true,
            data: {
                note: note,
                editable: true,
                addNote: addMode
            }
        }).afterClosed().subscribe( r=> {        
            if(r.result) { // ** save / update waypoint **
                let note= r.data;
                console.log(note)
                if(note.boundary) { delete note.boundary }
                console.log(note)
                
                if(!resId) { // add
                    resId= this.signalk.uuid.toSignalK();
                    this.signalk.post(`/signalk/v1/api/resources/notes/${resId}`, note).subscribe(
                        r=> this.skres.getNotes(),
                        err=> {
                            if(err.status && err.status==401) { this.showAuthRequired() }  
                            else { this.showAlert('ERROR:', 'Server could not add Note!') }                            
                        }
                    );
                }
                else { this.signalk.post(`/signalk/v1/api/resources/notes/${resId}`, note).subscribe(
                        r=> this.skres.getNotes(),
                        err=> {
                            if(err.status && err.status==401) { this.showAuthRequired() }  
                            else { this.showAlert('ERROR:', 'Server could not update Note!') }                            
                        }
                    );
                }
            }
        });
    }

    // ** handle resource deletion **
    resourceDelete(id:string) {
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
    routeDetails(e:any) {
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
                this.signalk.api.put(
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
                    err=> { 
                        this.skres.getRoutes();
                        if(err.status && err.status==401) { this.showAuthRequired() }  
                        else { this.showAlert('ERROR:', 'Server could not update Route details!') }
                    }
                );
            }
        });
    }

    routeDelete(e:any) { 
        this.dialog.open(ConfirmDialog, {
            disableClose: true,
            data: {
                message: 'Do you want to delete this Route?\n \nRoute will be removed from the server (if configured to permit this operation).',
                title: 'Delete Route:',
                button1Text: 'YES',
                button2Text: 'NO'
            }
        }).afterClosed().subscribe( res=> {
            if(res) {
                this.signalk.api.put('self','resources.routes', e.id, null)
                .subscribe( 
                    r=> {  
                        this.skres.getRoutes();
                        this.skres.getWaypoints();                            
                        if(r['state']=='COMPLETED') { this.app.debug('SUCCESS: Route deleted.') }
                        else { this.showAlert('ERROR:', 'Server could not delete Route!') }
                    },
                    err=> { 
                        if(err.status && err.status==401) { this.showAuthRequired() }  
                        else { this.showAlert('ERROR:', 'Server could not delete Route!') }
                    }
                );                     
            }      
        });        
    }

    routeAdd(e:any) {
        if(!e.coordinates) { return }    
        let res= this.skres.buildRoute(e.coordinates);
        
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
            if(r.result) { // ** save route **
                res['route'][1]['description']= r.data.comment || '';
                res['route'][1]['name']= r.data.name;
                this.signalk.api.put(
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
                    err=> { 
                        this.skres.getRoutes();
                        if(err.status && err.status==401) { this.showAuthRequired() }  
                        else { this.showAlert('ERROR:', 'Server could not add Route!') }
                    }
                );
            }
        });
    }

    routeSelected(e:any) {
        let t= this.app.data.routes.map(
            i=> { if(i[2]) { return i[0] }  }
        );
        this.app.config.selections.routes= t.filter(
            i=> { return (i) ? true : false }
        );      
        this.app.saveConfig();
    }

    routeActivate(e:any) { 
        let dt= new Date();
        let t= this.app.data.routes
            .map( i=> { if(i[0]==e.id) { return i }  })
            .filter( i=>{ return i });
        this.display.navData.pointIndex= 0;
        this.display.navData.pointTotal= t[0][1].feature.geometry.coordinates.length;
        let c= t[0][1].feature.geometry.coordinates[this.display.navData.pointIndex];
        let startPoint= {latitude: c[1], longitude: c[0]};        
        this.signalk.api.put('self', 'navigation/courseGreatCircle/activeRoute/href', `/resources/routes/${e.id}`)
        .subscribe( 
            r=> {
                this.signalk.api.put('self', 'navigation/courseGreatCircle/activeRoute/startTime', dt.toISOString())
                .subscribe( 
                    r=> { 
                        this.app.debug('Route activated');
                        this.signalk.api.put('self', 
                            'navigation/courseGreatCircle/nextPoint/position', 
                            startPoint
                        ).subscribe( r=> { this.app.debug('nextPoint set') } );                            

                    },
                    err=> { this.showAlert('ERROR:', 'Server could not Activate Route!') }
                );
            },
            err=> { 
                if(err.status && err.status==401) { this.showAuthRequired() }  
                else { this.showAlert('ERROR:', 'Server could not Activate Route!') }
            }
        );
    }   

    routeClearActive() { 
        this.signalk.api.put('self', 'navigation/courseGreatCircle/activeRoute/href', null)
        .subscribe( 
            r=> { 
                this.app.debug('Active Route cleared');
                this.display.navData.pointIndex= -1;
                this.display.navData.pointTotal= 0;
                this.signalk.api.put('self', 
                    'navigation/courseGreatCircle/nextPoint/position', 
                    null
                ).subscribe( r=> { this.app.debug('nextPont cleared') } );               
            },
            err=> { 
                if(err.status && err.status==401) { this.showAuthRequired() }  
                else { this.showAlert('ERROR:', 'Server could not clear Active Route!') }
            }
        );
    }      
    
    routeNextPoint(i:number) {
        let rte= this.app.data.routes
            .map( i=> { if(i[3]) { return i } })
            .filter( i=>{ return i } );
        let c= rte[0][1].feature.geometry.coordinates;
        if(i==-1) {
            if(this.display.navData.pointIndex>0) {
                this.display.navData.pointIndex--;
            }
            else { return }
        }
        else { // +1
            if(this.display.navData.pointIndex<this.display.navData.pointTotal-1) {
                this.display.navData.pointIndex++;
            }
            else { return }
        }
        let nextPoint= {
            latitude: c[this.display.navData.pointIndex][1], 
            longitude: c[this.display.navData.pointIndex][0], 
        }
        this.signalk.api.put('self', 
            'navigation/courseGreatCircle/nextPoint/position', 
            nextPoint
        ).subscribe( 
            r=> { this.app.debug('nextPoint set') },
            err=> { 
                if(err.status && err.status==401) { this.showAuthRequired() }  
                else { this.app.debug(err) }
            }
        );      
    }

    waypointGoTo(e:any) { 
        let wpt= this.app.data.waypoints.map( i=>{ if(i[0]==e.id) {return i} } ).filter(i=> {return i});
        this.signalk.api.put('self', 
            'navigation/courseGreatCircle/nextPoint/position', 
            wpt[0][1].position
        ).subscribe( 
            r=> { this.app.debug('Waypoint activated') },
            err=> { 
                if(err.status && err.status==401) { this.showAuthRequired() }  
                else { 
                    this.showAlert('ERROR:', 'Server could not set Waypoint!') 
                    this.app.debug(err);
                }
            }
        );
    }    

    waypointDelete(e:any) { 
        this.dialog.open(ConfirmDialog, {
            disableClose: true,
            data: {
                message: 'Do you want to delete this Waypoint?\nNote: Waypoint may be the Start or End of a route so proceed with care!\n \nWaypoint will be removed from the server (if configured to permit this operation).',
                title: 'Delete Waypoint:',
                button1Text: 'YES',
                button2Text: 'NO'
            }
        }).afterClosed().subscribe( res=> {
            if(res) {
                this.signalk.api.put('self','resources.waypoints', e.id, null)
                .subscribe( 
                    r=> {  
                        this.skres.getWaypoints();
                        if(r['state']=='COMPLETED') { this.app.debug('SUCCESS: Waypoint deleted.') }
                        else { this.showAlert('ERROR:', 'Server could not delete Waypoint!') }                            
                    },
                    err=> { 
                        if(err.status && err.status==401) { this.showAuthRequired() }  
                        else { this.showAlert('ERROR:', 'Server could not delete Waypoint!') }
                    }
                );
            }
        });          
    }

    waypointAdd(e:any=null) {      
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

    submitWaypoint(id:string, wpt:SKWaypoint, isNew=false) {
        this.signalk.api.put('self', `/resources/waypoints`, id, wpt).subscribe( 
            r=> { 
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
            err=> { 
                this.skres.getWaypoints();
                if(err.status && err.status==401) { this.showAuthRequired() }  
                else { this.showAlert('ERROR:', 'Server could not update Waypoint details!') }
            }
        );
    }

    waypointSelected(e:any) {
        let t= this.app.data.waypoints.map( i=> { if(i[2]) { return i[0] }  });
        this.app.config.selections.waypoints= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
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
    } 
    
    regionSelected(e:any) {
        if(!e) { return }
        let t= this.app.data.regions.map(
            i=> { if(i[2]) { return i[0] } }
        );
        this.app.config.selections.regions= t.filter(
            i=> { return (i) ? true : false }
        );   
        this.app.saveConfig();
    }     

    aisSelected(e:any) {
        this.app.config.selections.aisTargets= e;
        this.app.saveConfig();
    }   

    // ** handle display ais target properties **
    aisProperties(id: string) {
        let ais= this.display.vessels.aisTargets.get(id);
        if(ais) {
            this.dialog.open(AISPropertiesDialog, {
                disableClose: true,
                data: {
                    title: 'Vessel Properties',
                    target: ais
                }
            });
        }
    }      

    // ** return local charts sorted by scale descending.
    chartsLocalByScale() {
        let c= (this.app.data.charts.length>2) ? this.app.data.charts.slice(2) : [];
        // ** sort local maps by scale descending
        c.sort( (a,b)=> { return b[1].scale > a[1].scale ? 1 : -1 } );
        return c;
    }

    // ******** Anchor Watch EVENTS ************
    anchorEvent(e:any) {
        if(e.action=='radius') {
            this.app.config.anchor.radius= e.radius;            
            this.signalk.api.put('self', '/navigation/anchor/maxRadius', 
                this.app.config.anchor.radius
            ).subscribe(
                r=> { this.getAnchorStatus() },
                err=> { 
                    this.parseAnchorError(err); 
                    this.getAnchorStatus();  
                }
            );               
            return;
        }
        if(!e.raised) {  // ** drop anchor
            this.app.config.anchor.raised= false;
            this.app.config.anchor.position= this.display.vessels.self.position;
            this.signalk.api.put('self','/navigation/anchor/position', 
                {
                    latitude: this.app.config.anchor.position[1],
                    longitude: this.app.config.anchor.position[0]
                }
            ).subscribe(
                r=> { 
                    this.signalk.api.put('self', '/navigation/anchor/maxRadius', 
                        this.app.config.anchor.radius
                    ).subscribe(
                        r=> { this.getAnchorStatus() },
                        err=> { this.parseAnchorError(err); this.getAnchorStatus(); }
                    ); 
                 },
                err=> { 
                    this.parseAnchorError(err); 
                    this.getAnchorStatus(); 
                }
            );                                         
        }
        else {  // ** raise anchor
            this.app.config.anchor.raised= true;
            this.display.alarms.delete('anchor');
            this.signalk.api.put('self', '/navigation/anchor/position', null ).subscribe(
                r=> { this.getAnchorStatus() },
                err=> { 
                    this.parseAnchorError(err); 
                    this.getAnchorStatus(); 
                }
            );             
        }
    }

    // ** query anchor status
    getAnchorStatus() {
        this.app.debug('Retrieving anchor status...');
        this.signalk.api.get('/vessels/self/navigation/anchor').subscribe(
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
            err=> { 
                this.app.config.anchor.position= [0,0];
                this.app.config.anchor.raised= true;
            }
        ); 
    }

    // ** process anchor watch errors
    parseAnchorError(e:any) {
        this.app.debug(e); 
        if(e.status && e.status==401) { 
            this.showLogin();
            return false;
        }  
        if(e.status && e.status!=200) { 
            let errText= 'Server returned an error. This function may not be supported by yor server.';
            this.showAlert('Anchor Watch:', errText);
            return false;
        }  
        else { return true }      
    }

    // ******** Alarm EVENTS ************
    muteAlarm(id:string) { this.display.alarms.get(id)['muted']=true }

    acknowledgeAlarm(id:string) { this.display.alarms.get(id)['acknowledged']=true }
 
    
    // ******** SIGNAL K STREAM *************

    // ** open WS Stream 
    openSKStream(options?:any, toMode?: APP_MODE) {      
        if(typeof toMode!== 'undefined') { // suppress steam close warning dialog and close Stream
            this.display.onCloseWarning.suppress= true;
            this.signalk.stream.close();
        }
        if(options && options.startTime) { 
            let r= this.signalk.openPlayback(null, options)    
            if(typeof r !=='boolean') { console.warn(r) }             
        }
        else { 
            let r= this.signalk.openStream(null,'none')
            if(typeof r !=='boolean') { console.warn(r) }             
        }
    }

    // ******** STREAM Event handlers **************

    // ** query server for current values **
    queryAfterConnect() {
        // ** get vessel details
        this.signalk.api.getSelf().subscribe(
            r=> {  
                this.display.vessels.self.mmsi= (r['mmsi']) ? r['mmsi'] : null;
                this.display.vessels.self.name= (r['name']) ? r['name'] : null;
                // ** query navigation status
                this.signalk.api.get('/vessels/self/navigation').subscribe(
                    r=> {
                        let c;
                        if( r['courseRhumbline'] ) { c= r['courseRhumbline'] }
                        if( r['courseGreatCircle'] ) { c= r['courseGreatCircle'] }
                        if( c && c['activeRoute'] && c['activeRoute']['href']) { 
                            this.processActiveRoute( c['activeRoute']['href'].value );
                        }                
                    },
                    err=> { this.app.debug('No navigation data available!') }
                ); 
                // ** query for resources
                this.skres.getRoutes();
                this.skres.getWaypoints();
                this.skres.getCharts();  
                this.skres.getNotes();
                // ** query anchor alarm status
                this.getAnchorStatus();                
            },
            err=> { 
                if(err.status && err.status==401) { this.showLogin(null, false, true) }  
                this.app.debug('No vessel data available!') 
            }
        );          
    }

    // ** subscribe to signal k paths
    subscribeSKPaths() {
        this.signalk.stream.subscribe(
            'vessels.*',
            [
                {"path":"uuid","period":10000,"policy":'fixed'},
                {"path":"name","period":10000,"policy":'fixed'},
                {"path":"communication.callsignVhf","period":10000,"policy":'fixed'},
                {"path":"mmsi","period":10000,"policy":'fixed'},
                {"path":"port","period":10000,"policy":'fixed'},
                {"path":"flag","period":10000,"policy":'fixed'},
                {"path":"navigation.position","period":10000,"policy":'fixed'},
                {"path":"navigation.state","period":10000,"policy":'fixed'},
                {"path":"navigation.courseOverGroundTrue*","period":10000,"policy":'fixed'},
                {"path":"navigation.courseOverGroundMagnetic*","period":10000,"policy":'fixed'},
                {"path":"navigation.headingMagnetic*","period":10000,"policy":'fixed'},
                {"path":"navigation.headingTrue*","period":10000,"policy":'fixed'},
                {"path":"navigation.speedOverGround","period":10000,"policy":'fixed'},
                {"path":"environment.wind.*","period":10000,"policy":'fixed'},
            ]
        );
        this.signalk.stream.subscribe(
            "vessels.self",
            [
                {"path":"navigation.*","period":1000,"policy":'fixed'},
                {"path":"environment.wind.*","period":1000,"policy":'fixed'},
                {"path":"notifications.*","period":1000}
            ]
        );         
    } 

    // ** set available features
    setFeatures() { this.features.playbackAPI= true }

    // ** handle connection established
    onConnect(e?:any) {
        this.app.debug('onConnect: STREAM connected...');
        // ** query server for status
        this.queryAfterConnect();
        // ** start trail / AIS timers
        this.startTimers();
        // ** discover features
        this.setFeatures();
    }

    // ** handle connection closure
    onClose(e?:any) {
        this.app.debug('onClose: STREAM connection closed...');
        if(!this.display.onCloseWarning.suppress) {
            let data= { title: 'Connection Closed:', buttonText: 'Re-connect', message: ''};
            if(this.signalk.stream.playbackMode || this.display.onCloseWarning.type=='other') {
                data.buttonText= 'OK'
                data.message= 'Unable to open Playback connection.';
            }
            else { data.message= 'Connection to the Signal K server has been closed.'}  

            this.dialog.open(AlertDialog, { disableClose: true, data: data })
            .afterClosed().subscribe( ()=>{ 
                if(this.mode==APP_MODE.REALTIME) { this.openSKStream() }
                else { this.showPlaybackSettings() }
            });
        }
        else { this.display.onCloseWarning.suppress= false }
        this.stopTimers();
    }
    
    // ** handle error message
    onError(e:any) { console.warn(e) }
    
    // ** handle delta message received
    onMessage(e: any) { 
        if(this.signalk.stream.isHello(e)) { // ** hello message
           this.app.debug(e);
           this.display.onCloseWarning.type=null;
            if(this.signalk.stream.playbackMode) { this.mode= APP_MODE.PLAYBACK }
            else { 
                this.mode= APP_MODE.REALTIME;
                this.subscribeSKPaths();
            }
            this.app.data.selfId= e.self;
            return;
        }
        if(typeof e.updates!=='undefined') { // delta message
            e.updates.forEach( u=> {
                if(this.mode==APP_MODE.PLAYBACK) { 
                    let d= new Date(u.timestamp);
                    this.display.playback.time= `${d.toDateString().slice(4)} ${d.toTimeString().slice(0,8)}`;
                }
                else { this.display.playback.time= null }            
                u.values.forEach( v=> {
                    if(this.signalk.stream.isSelf(e)) { this.displayVesselSelf(v) }
                    else { this.displayVesselOther(e.context, v) }
                });
            }); 
            return;
        }  
        // ** unkown message type
        this.display.onCloseWarning.type='other'


    }   

    // ******** Process STREAM data **************

    displayVesselSelf(v: any) {
        let d= this.display.vessels.self;
        let updateVlines= true;
        this.processVessel(d,v);

        // ** vessel on map rotation
        this.display.map.vesselRotation= (typeof d.heading!== 'undefined') ? d.heading : (d.cog || 0);

        // ** add to true / magnetic selection list
        if( v.path=='navigation.headingMagnetic' && 
            this.app.data.headingValues.indexOf(v.path)==-1) { 
                this.app.data.headingValues.push(v.path);           
        }        
        // ** update vessel on map **
        if( v.path=='navigation.position') {
            this.display.showSelf= true;
            // ** move map
            if(this.app.config.map.moveMap) {
                this.display.map.center= d.position;
            } 
            // ** locate vessel popover
            if(this.display.overlay.show && this.display.overlay['type']=='vessel') { 
                this.display.overlay.position= d.position 
            }                       
        }
        if(v.path=='navigation.state') { updateVlines= false; }
        if(v.path.indexOf('navigation.courseRhumbline')!=-1 
            || v.path.indexOf('navigation.courseGreatCircle')!=-1)  { 
                this.processCourse(v); 
        }
        if(v.path=='communication.callsignVhf') { updateVlines= false; }   

        // ** update map display **
        if( updateVlines) { this.mapVesselLines() }
        this.mapRotate();  

        // ** alarms **
        if(v.path.indexOf('notifications.')!=-1) { this.processAlarms(v) }                       
    }

    displayVesselOther(id: string, v: any) {
        if( !this.display.vessels.aisTargets.has(id) ) {
            let vessel= new SKVessel();
            vessel.position= null;
            this.display.vessels.aisTargets.set(id, vessel );
        }
        let d= this.display.vessels.aisTargets.get(id);
        d.lastUpdated= new Date();

        this.processVessel(d,v);

        if( v.path=='' ) { 
            if(typeof v.value.name!= 'undefined') { d.name= v.value.name }
            if(typeof v.value.mmsi!= 'undefined') { d.mmsi= v.value.mmsi }
        } 
        // ** locate / update ais popover
        if( v.path=='navigation.position') {
            if(this.display.overlay['type']=='ais' && this.display.overlay.show 
                    && this.display.overlay['id']==id) { 
                this.display.overlay.position= d.position;
            }                     
        }           
    }

    // ** process comon vessel data and true / magnetic preference **
    processVessel(d: SKVessel, v:any) {
        if(v.path=='navigation.courseOverGroundTrue') { 
            d.cogTrue= v.value;
            if(!this.app.useMagnetic) { d.cog= v.value }
        }
        if(v.path=='navigation.courseOverGroundMagnetic') { 
            d.cogMagnetic= v.value;
            if(this.app.useMagnetic) { d.cog= v.value }
        }
        if( v.path=='navigation.headingTrue' ) { 
            d.headingTrue= v.value;
            if(!this.app.useMagnetic) { d.heading= v.value }
        } 
        if( v.path=='navigation.headingMagnetic' ) { 
            d.headingMagnetic= v.value;
            if(this.app.useMagnetic) { d.heading= v.value }         
        }
        if(v.path=='navigation.speedOverGround') { d.sog= v.value }
        if( v.path=='navigation.position') {
            d.position= [ v.value.longitude, v.value.latitude];                      
        }        
        if(v.path=='navigation.state') { d.state= v.value }
        if(v.path=='communication.callsignVhf') { d.callsign= v.value }          
        if(v.path=='environment.wind.directionTrue') { 
            d.wind.twd= v.value;
            if(!this.app.useMagnetic) { d.wind.direction= v.value }
        }
        if(v.path=='environment.wind.directionMagnetic') { 
            d.wind.mwd= v.value;
            if(this.app.useMagnetic) { d.wind.direction= v.value }
        }
        if(v.path=='environment.wind.speedTrue') { d.wind.tws= v.value }
        if(v.path=='environment.wind.angleApparent') { d.wind.awa= v.value }
        if(v.path=='environment.wind.speedApparent') { d.wind.aws= v.value }
    }

    // ** process course data
    processCourse(data: any) {
        let path= data.path.split('.');
     
        // ** active route **
        if(path[2]=='activeRoute') {
            if(path[3]=='href') { this.processActiveRoute(data.value) }
        }   
        // ** course **
        if(path[2]=='crossTrackError') {
            this.display.navData.xte= (this.app.config.units.distance=='m') ? 
                data.value/1000 : Convert.kmToNauticalMiles(data.value/1000);                  
        }
        // ** next point **
        if(path[2]=='nextPoint') {
            if(path[3]=='position') {
                    this.display.navData.position= (data.value) ? 
                        [data.value.longitude, data.value.latitude] : null;
                if(this.app.data.activeRoute) {
                    let t= this.app.data.routes
                        .map( i=> { if(i[3]) { return i }  })
                        .filter( i=>{ return i });
                    if(t.length!=0) {
                        let c= t[0][1].feature.geometry.coordinates;
                        for(let i=0; i<c.length;++i) {
                            if(c[i][0]==this.display.navData.position[0] &&
                                c[i][1]==this.display.navData.position[1] ) {
                                this.display.navData.pointIndex=i;
                            }
                        }
                    }
                }
            }              
            if(path[3]=='distance') {  
                this.display.navData.dtg= (this.app.config.units.distance=='m') ? 
                    data.value/1000 : Convert.kmToNauticalMiles(data.value/1000);                
            }
            if(path[3]=='bearingTrue') { 
                this.display.navData.bearingTrue= Convert.radiansToDegrees(data.value);
                if(!this.app.useMagnetic) {
                    this.display.navData.bearing.value= this.display.navData.bearingTrue;
                    this.display.navData.bearing.type= 'T';
                } 
            }
            if(path[3]=='bearingMagnetic') { 
                this.display.navData.bearingMagnetic= Convert.radiansToDegrees(data.value);
                if(this.app.useMagnetic) {
                    this.display.navData.bearing.value= this.display.navData.bearingMagnetic;
                    this.display.navData.bearing.type= 'M';
                }                 
            }
            if(path[3]=='velocityMadeGood') {  
                this.display.navData.vmg= (this.app.config.units.speed=='kn') ? 
                    Convert.msecToKnots(data.value) : data.value;
            }
            if(path[3]=='timeToGo') { this.display.navData.ttg= data.value/60 }           
        }          
    }

    // ** process / cleanup AIS targets
    processAIS(toggled?: boolean) {
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
                this.aisMgr.updateList.push(k);
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
    
    // ** process notification messages **
    processAlarms(v) {
        let stdAlarms= ['mob','sinking','fire','piracy','flooding','collision','grounding','listing','adrift','abandon'];
        if( this.app.config.depthAlarm.enabled) {
            if(v.path=='notifications.environment.depth.belowTransducer') {
                this.updateAlarmState('depth', v.value);
            }
            if(v.path=='notifications.environment.depth.belowSurface') {
                this.updateAlarmState('depth', v.value);
            }
            if(v.path=='notifications.environment.depth.belowKeel') {
                this.updateAlarmState('depth', v.value);
            }                                        
        }
        if(v.path=='notifications.navigation.anchor') {
            this.updateAlarmState('anchor', v.value);
        } 
        let p= v.path.substring( v.path.indexOf('.')+1 )
        if(stdAlarms.indexOf( p )!=-1) { this.updateAlarmState(p, v.value) }                                     
    }
    
    // ** process alarm state **
    updateAlarmState(id: string, av: any) {
        let alarm= (this.display.alarms.has(id)) ? this.display.alarms.get(id) : null;

        if(av==null) {    // alarm cancelled
            this.display.alarms.delete(id);
        }
        else if(av.state=='normal') { // alarm returned to normal state
            if( alarm && alarm.acknowledged && !this.depthAlarmSmoothing ) { 
                this.depthAlarmSmoothing=true;
                setTimeout( ()=> {
                    this.depthAlarmSmoothing=false;
                    this.display.alarms.delete(id);
                }, this.app.config.depthAlarm.smoothing);
            }
        }        
        else if(av.state!=='normal') {
            if( !alarm ) {    // create alarm entry
                this.display.alarms.set(id, {
                    sound: (av.method.indexOf('sound')!=-1) ? true : false,
                    visual: (av.method.indexOf('visual')!=-1) ? true : false,
                    state: av.state,
                    message: av.message
                });
            }
            else {  // update alarm entry
                alarm.state= av.state;
                alarm.message= av.message;
            }  
        }
    }

    // ** process active route information **
    processActiveRoute(value: any) {
        let a= (value) ? value.split('/') : null;
        this.app.data.activeRoute= (a) ? a[a.length-1] : null;        
        this.app.data.routes.forEach( i=> {
            if(i[0]==this.app.data.activeRoute) {
                i[3]= true;
                let c= i[1].feature.geometry.coordinates;
                this.display.navData.pointTotal= c.length;
                if(this.display.navData.position) {
                    for(let i=0; i<c.length; i++) {
                        if(c[i][0]==this.display.navData.position[0] &&
                            c[i][1]==this.display.navData.position[1] ) {
                            this.display.navData.pointIndex=i;
                        }
                    }  
                }              
            }
            else { i[3]= false }
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

    // ** clear course / navigation data **
    clearCourseData() {
        let idx= this.display.navData.pointIndex;
        this.display.navData= {
            vmg: null,
            dtg: null,
            ttg: null,
            bearing: {value: null, type: null},
            bearingTrue: null,
            bearingMagnetic: null,
            xte: null,
            position: [null, null],
            pointIndex: idx,
            pointTotal: 0
        }
    }

}
