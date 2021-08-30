import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';

import { AppInfo } from './app.info';
import { AboutDialog, LoginDialog } from 'src/app/lib/app-ui';
import { PlaybackDialog } from 'src/app/lib/ui/playback-dialog';

import { SettingsDialog, AlarmsFacade, AlarmsDialog, 
        SKStreamFacade, SKSTREAM_MODE, SKResources, 
        SKOtherResources, SKRegion, AISPropertiesModal, AtoNPropertiesModal, AircraftPropertiesModal, 
        ActiveResourcePropertiesModal, GPXImportDialog, GPXExportDialog, GeoJSONImportDialog,
        TracksModal, ResourceSetModal, CourseSettingsModal,
        ResourceImportDialog, Trail2RouteDialog } from 'src/app/modules';

import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

    @ViewChild('sideright', {static: false}) sideright;

    public display= {
        fullscreen: { active: false, enabled: document.fullscreenEnabled},
        badge: { hide: true, value: '!'},
        leftMenuPanel: false,
        instrumentPanelOpen: true,
        instrumentAppActive: true,
        routeList: false,
        waypointList: false,
        chartList: false,
        noteList: false,     
        aisList: false,
        anchorWatch: false,
        navDataPanel: {
            show: false,
            nextPointCtrl: false,
            apModeColor: '',
            apModeText: ''
        },
        playback: { time: null },
        map: { center: [0,0], setFocus: false },
        audio: { state: '' }
    }

    public draw= {
        enabled: false,
        mode: null,
        type: null,
        modify: false,
        forSave: null,
        properties: {}
    }

    public measure= { enabled: false } 

    // ** APP features / mode **
    public features= { playbackAPI: true }
    public mode: SKSTREAM_MODE= SKSTREAM_MODE.REALTIME;   // current mode

    private timers= [];

    // ** external resources **
    private lastInstUrl: string;
    private lastInstParams: string;
    public instUrl: SafeResourceUrl;
    private lastVideoUrl: string;
    private selFavourite: number= -1;
    public vidUrl: SafeResourceUrl;
    
    public convert= Convert;
    private obsList= [];    // observables array
    private streamOptions= {options: null, toMode: null};  
    
    constructor(
                public app: AppInfo, 
                public alarmsFacade: AlarmsFacade,
                private stream: SKStreamFacade,
                public skres: SKResources,
                public skOtherRes: SKOtherResources,
                public signalk: SignalKClient,
                private dom: DomSanitizer,
                private overlayContainer: OverlayContainer,
                private bottomSheet: MatBottomSheet,
                private dialog: MatDialog) { 
        // set self to active vessel
        this.app.data.vessels.active= this.app.data.vessels.self;
    }

   // ********* LIFECYCLE ****************

    ngAfterViewInit() { 
        setTimeout( 
            ()=> { 
                let wr= this.app.showWelcome();
                if(wr) {
                    wr.afterClosed().subscribe( r=> { if(r) this.openSettings(r) })
                }
            }, 500
        );      
    }

    enableAudio() { 
        if(this.app.audio.context) { 
            this.app.audio.context.resume();
        } 
    }

    handleHasWakeLock(value:boolean) {
        setTimeout( ()=> this.app.data.hasWakeLock= value, 500);
    }

    ngOnInit() {
        // ** audio context handing ** 
        this.display.audio.state= this.app.audio.context.state;
        this.app.debug('audio state:', this.display.audio.state);
        this.app.audio.context.onstatechange= ()=> {
            this.app.debug('audio statechange:', this.app.audio.context.state);
            this.display.audio.state= this.app.audio.context.state;
        }

        // ** apply loaded app config	
        this.display.map.center= this.app.config.map.center;
        if(this.app.config.plugins.startOnOpen) { this.display.instrumentAppActive= false }

        // overlay dark-theme
        this.setDarkTheme();

        this.lastInstUrl= this.app.config.plugins.instruments;
        this.lastInstParams= this.app.config.plugins.parameters;
        this.instUrl= this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl());
        this.lastVideoUrl= this.app.config.resources.video.url;
        this.vidUrl= this.dom.bypassSecurityTrustResourceUrl(`${this.app.config.resources.video.url}`);
        
        // ** connect to signalk server and intialise
        this.connectSignalKServer(); 

        // ********************* SUBSCRIPTIONS *****************
        // ** SIGNAL K STREAM **
        this.obsList.push( this.stream.delta$().subscribe( msg=> this.onMessage(msg) ) );
        this.obsList.push( this.stream.connect$().subscribe( msg=> this.onConnect(msg) ) );
        this.obsList.push( this.stream.close$().subscribe( msg=> this.onClose(msg) ) );
        this.obsList.push( this.stream.error$().subscribe( msg=> this.onError(msg) ) );
        // ** COURSE DATA **
        this.obsList.push( this.skres.activeRoute$().subscribe ( msg=> { this.updateNavPanel(msg) }));
        // ** RESOURCES update event
        this.obsList.push( this.skres.update$().subscribe( value=> this.handleResourceUpdate(value) ) );
        // ** SETTINGS - handle settings load / save events
        this.obsList.push( this.app.settings$.subscribe( r=> this.handleSettingsEvent(r) ) );        

        // ** NOTIFICATIONS - Anchor Status **
        this.obsList.push( 
            this.alarmsFacade.anchorStatus$().subscribe(
                r=> {
                    if(r.error) { 
                        if( r.result== 401) { this.showLogin() }
                        else { 
                            this.app.showAlert(
                                'Anchor Watch:', 
                                'Server returned an error. This function may not be supported by your server.'
                            );
                        }
                    }
                }
            )
        );

        // fullscreen event handlers
        document.addEventListener('fullscreenchange', ()=> {
            //console.log(document.fullscreenElement)
            if(document.fullscreenElement){ this.display.fullscreen.active=true }
            else { this.display.fullscreen.active=false }
        });
        document.addEventListener('fullscreenerror', e=> {
            console.warn(e);
            this.display.fullscreen.active=false;
        });        
    } 

    ngOnDestroy() {
        // ** clean up
        this.stopTimers();
        this.stream.terminate();
        this.signalk.disconnect();
        this.obsList.forEach( i=> i.unsubscribe() );
    }

    // ********* DISPLAY / APPEARANCE ****************

    // ** return the map orientation **
    getOrientation() {
        return (this.app.config.map.northUp) ?
            'rotate(' + 0 + 'deg)' :
            'rotate(' + (0-this.app.data.vessels.active.orientation) + 'rad)';
    }

    public toggleFullscreen() { 
        let docel = document.documentElement;
        let fscreen = docel.requestFullscreen || docel['webkitRequestFullScreen'] 
                || docel['mozRequestFullscreen'] || docel['msRequestFullscreen'];
        if(fscreen) {
            if(!document.fullscreenElement) { fscreen.call(docel) }
            else { if(document.exitFullscreen) document.exitFullscreen() }
            this.focusMap();
        }
    }

    private setDarkTheme() {
        let mq= window.matchMedia("(prefers-color-scheme: dark)");

        if( (this.app.config.darkMode.source==0 && mq.matches) ||
            (this.app.config.darkMode.source==1 && this.app.data.vessels.self.mode=='night') ||
            this.app.config.darkMode.source==-1 ) { 

            this.overlayContainer.getContainerElement().classList.add('dark-theme');
            this.app.config.darkMode.enabled= true; 
        }
        else {
            this.overlayContainer.getContainerElement().classList.remove('dark-theme');
            this.app.config.darkMode.enabled= false;
        }
    }

    private formatInstrumentsUrl() {
        let url:string= `${this.app.host}${this.app.config.plugins.instruments}`;
        let params:string= (this.app.config.plugins.parameters)
            ? (this.app.config.plugins.parameters.length>0 && 
                this.app.config.plugins.parameters[0]!=='?')    
                ? `?${this.app.config.plugins.parameters}` 
                : this.app.config.plugins.parameters
            : '';
        return (params) ? `${url}/${params}` : url;
    }

    // ** select prev/next favourite plugin **
    public selectPlugin(next:boolean=false) {
        if(next) {
            if( this.selFavourite==-1) { this.selFavourite=0 }
            else if(this.selFavourite==this.app.config.selections.pluginFavourites.length-1) { 
                this.selFavourite=-1; 
            }
            else { this.selFavourite++ }
        }
        else {
            if( this.selFavourite==-1) { 
                this.selFavourite=this.app.config.selections.pluginFavourites.length-1;
            }
            else if(this.selFavourite==0) { this.selFavourite=-1 }
            else { this.selFavourite-- }
        }
        let url:string= (this.selFavourite==-1) ? this.formatInstrumentsUrl()
            : `${this.app.host}${this.app.config.selections.pluginFavourites[this.selFavourite]}`;

        this.instUrl= this.dom.bypassSecurityTrustResourceUrl(url);
    }    

    // ** create route from vessel trail **
    public trailToRoute() {   
        this.dialog.open(Trail2RouteDialog, {
            disableClose: true,
            data: { trail: this.app.data.trail }
        }).afterClosed().subscribe( r=> {
            if(r.result) {
                this.skres.showRouteNew({coordinates: r.data});
            }
            this.focusMap();
        });
    }

    // ** display selected experiment UI **
    public openExperiment(e:any) {   
        switch(e.choice) {
            case 'tracks':  // tracks
                this.bottomSheet.open(TracksModal, {
                    disableClose: true,
                    data: { title: 'Tracks', skres: this.skres }
                }).afterDismissed().subscribe( ()=> {
                    this.focusMap(); 
                });
                break;             
            default:  // resource set
                if(this.app.config.resources.paths.includes(e.choice)) {
                    this.bottomSheet.open(ResourceSetModal, {
                        disableClose: true,
                        data: { path: e.choice, skres: this.skOtherRes }
                    }).afterDismissed().subscribe( ()=> {
                        this.focusMap(); 
                    });
                }
        }
    }

    // ** display course settings screen **
    public openCourseSettings() {
        this.bottomSheet.open(CourseSettingsModal, {
            disableClose: true,
            data: { title: 'Course Settings' }
        }).afterDismissed().subscribe( ()=> {
            this.focusMap(); 
        });
    }

    // ************************************************

    // ** establish connection to server
    private connectSignalKServer() {
        this.app.data.selfId= null;
        this.app.data.server= null;
        this.signalk.connect(this.app.hostName, this.app.hostPort, this.app.hostSSL).subscribe( 
            ()=> {
                this.signalk.authToken= this.app.getToken();
                this.app.loadSettingsfromServer().subscribe( r=> {
                    let msg= (r) ? 'Settings loaded from server.' :
                    'Error loading Settings from server!';
                    console.log(msg);
                    if(r) { this.skres.alignResourceSelections() }
                });
                this.app.data.server= this.signalk.server.info; 
                this.openSKStream();
            },
            ()=> {
                this.app.showAlert(
                    'Connection Error:',  
                    'Unable to contact Signal K server!', 
                    'Try Again'
                ).subscribe( ()=>{ this.connectSignalKServer() } );
            }
        );
    } 

    // ** start trail / AIS timers
    private startTimers() {
        // ** start trail logging interval timer
        this.app.debug(`Starting Trail logging timer...`);
        this.timers.push( setInterval( ()=> { this.processTrail() }, 5000 ) );
    }
    // ** stop timers
    private stopTimers() {
        this.app.debug(`Stopping timers:`);
        this.timers.forEach( t=> clearInterval(t) );
        this.timers= [];
    }

    // ** process local vessel trail **
    private processTrail(trailData?:Array<any>) {
        if(!this.app.config.vesselTrail) { return }
        // ** update vessel trail **
        let t= this.app.data.trail.slice(-1);
        if(this.app.data.vessels.showSelf) {
            if(t.length==0 ) { 
                this.app.data.trail.push(this.app.data.vessels.active.position);
                return;
            }
            if( this.app.data.vessels.active.position[0]!=t[0][0] ||
                    this.app.data.vessels.active.position[1]!=t[0][1] ) {
                this.app.data.trail.push(this.app.data.vessels.active.position);
            }
        }
        if(!trailData || trailData.length==0) {    // no server trail data supplied
            if(this.app.data.trail.length%60==0 && this.app.data.serverTrail) { 
                if(this.app.config.selections.trailFromServer) {
                    this.skres.getVesselTrail();    // request trail from server
                }
            }
            this.app.data.trail= this.app.data.trail.slice(-5000); 
        }
        else {  // use server trail data, keep minimal local trail data 
            let lastseg= trailData.slice(-1);
            let lastpt= (lastseg.length!=0) ? lastseg[0].slice(-1) : 
                (trailData.length>1) ? trailData[trailData.length-2].slice(-1) : [];
            this.app.data.trail= lastpt;
        } 
        let trailId= (this.mode==SKSTREAM_MODE.PLAYBACK) ? 'history' : 'self';
        this.app.db.saveTrail(trailId, this.app.data.trail);
    }    

    // ** RESOURCES event handlers **
    private handleResourceUpdate(e:any) {
        // ** handle routes get and update NavData based on activeRoute
        if(e.action=='get' && e.mode=='route') { 
            this.stream.setNavData( this.skres.getActiveRouteCoords() );
            this.updateNavPanel(e);
        }
        // ** trail retrieved from server **
        if(e.action=='get' && e.mode=='trail') { 
            this.processTrail(e.data);
        }        
        // ** create note in group **
        if(e.action=='new' && e.mode=='note') { 
            if(this.app.config.resources.notes.groupRequiresPosition) {
                this.drawStart(e.mode, {group: e.group}) 
            }
            else { this.skres.showNoteEditor({group: e.group}) }
        }
    }   
    
    // ** SETTINGS event handler **
    private handleSettingsEvent(e:any) {
        this.app.debug(`App: settings.update$`,'warn');
        if(e.action=='load' && e.setting=='config') {
            this.app.data.trueMagChoice= this.app.config.selections.headingAttribute;
        }
        if(e.action=='save' && e.setting=='config') {
            this.setDarkTheme();  // **  set theme **
            if(this.app.data.trueMagChoice!= this.app.config.selections.headingAttribute) {
                this.app.debug('True / Magnetic selection changed..');
                this.app.data.vessels.self.heading= this.app.useMagnetic ? 
                    this.app.data.vessels.self.headingMagnetic : 
                    this.app.data.vessels.self.headingTrue;
                this.app.data.vessels.self.cog= this.app.useMagnetic ? 
                    this.app.data.vessels.self.cogMagnetic : 
                    this.app.data.vessels.self.cogTrue;
                this.app.data.vessels.self.wind.direction= this.app.useMagnetic ? 
                    this.app.data.vessels.self.wind.mwd : 
                    this.app.data.vessels.self.wind.twd;

                this.app.data.vessels.aisTargets.forEach( (v,k)=> {
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

            if(this.lastInstUrl!= this.app.config.plugins.instruments ||
                    this.lastInstParams!= this.app.config.plugins.parameters) {
                this.lastInstUrl= this.app.config.plugins.instruments;
                this.lastInstParams= this.app.config.plugins.parameters;
                this.instUrl= this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl());
            }
            if(this.lastVideoUrl!= this.app.config.resources.video.url) {
                this.lastVideoUrl= this.app.config.resources.video.url
                this.vidUrl= this.dom.bypassSecurityTrustResourceUrl(`${this.app.config.resources.video.url}`);            
            }
            // ** trail **
            if(this.app.config.vesselTrail) {   // show trail
                if(this.app.config.selections.trailFromServer) {
                    this.skres.getVesselTrail();
                }
                else { this.app.data.serverTrail= false }
            }         
        }    
        // update instrument app state
        if(this.app.config.plugins.startOnOpen) {
            if(!this.display.instrumentPanelOpen) { this.display.instrumentAppActive= false }
        }
        else { this.display.instrumentAppActive= true }        
    }

    // ** trigger focus of the map so keyboard controls work
    public focusMap() { 
        this.display.map.setFocus= true;
        // reset value to ensure change detection
        setTimeout( ()=> { this.display.map.setFocus= false }, 1000);
    }

    // ********* SIDENAV ACTIONS *************
  
    public leftSideNavAction(e:boolean) {
        if(!e) { this.focusMap() }  // set when closed
    }

    public rightSideNavAction(e:boolean) {
        this.display.instrumentPanelOpen= e;
        if(this.app.config.plugins.startOnOpen) {
            this.display.instrumentAppActive= e;
        }
        if(!e) { this.focusMap() }  // set when closed
    }

    public displayLeftMenu( menulist:string='', show:boolean= false) {
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
        if(!show) { this.focusMap() }
    }    

    // ********* MAIN MENU ACTIONS *************

    // ** open about dialog **
    public openAbout() { 
        this.dialog.open(AboutDialog, {
            disableClose: false,
            data: {
                name: this.app.name,  
                version: this.app.version, 
                description: this.app.description, 
                logo: this.app.logo,  
                url: this.app.url
            }
        }).afterClosed().subscribe( ()=>this.focusMap() );  
    }  

    // ** open settings dialog **
    public openSettings(prefs: boolean= false) {  
        this.dialog.open( SettingsDialog, { 
            disableClose: true, 
            data: {openPrefs: prefs },
            maxWidth: '90vw',
            minWidth: '90vw'
        })
        .afterClosed().subscribe( (doSave)=> {
            this.focusMap();
            if(doSave) { this.app.saveConfig() }
        });
    }      

    // ** GPX File processing **
    public processGPX(e:any) {
        this.dialog.open(GPXImportDialog, {
            disableClose: true,
            data: { 
                fileData: e.data,
                fileName: e.name
            }
        }).afterClosed().subscribe( errCount=> {
            if(errCount<0) { // cancelled  
                this.focusMap();
                return;
            }
            this.fetchResources();             
            if(errCount==0) { this.app.showAlert('GPX Load','GPX file resources loaded successfully.') }
            else { this.app.showAlert('GPX Load','Completed with errors!\nNot all resources were loaded.') }
            this.focusMap();
        });       
    }

    // ** Save resources to GPX File **
    public saveToGPX() {
        this.dialog.open(GPXExportDialog, {
            disableClose: true,
            data: { 
                routes: this.app.data.routes,
                waypoints: this.app.data.waypoints,
                tracks: [this.app.data.trail]
            }
        }).afterClosed().subscribe( errCount=> {
            if(errCount<0) { // cancelled  
                this.focusMap();
                return;
            }          
            if(errCount==0) { this.app.showAlert('GPX Save','Resources saved to GPX file successfully.') }
            else { this.app.showAlert('GPX Save','Error saving resources to GPX file!') }
            this.focusMap();
        });       
    }

    // process GeoJSON file
    processGeoJSON(e:any) { 
        this.dialog.open(GeoJSONImportDialog, {
            disableClose: true,
            data: { 
                fileData: e.data,
                fileName: e.name
            }
        }).afterClosed().subscribe( errCount=> {
            if(errCount<0) { return } // cancelled
            this.fetchResources();             
            if(errCount==0) { this.app.showAlert('GeoJSON Load','GeoJSON features loaded successfully.') }
            else { this.app.showAlert('GeoJSON Load','Completed with errors!\nNot all features were loaded.') }
            this.focusMap();
        });        
    }   
    
    // Upload Resources
    uploadResources() { 
        this.dialog.open(ResourceImportDialog, {
            disableClose: true,
            data: {}
        }).afterClosed().subscribe( res=> {
            if(!res) { return } // cancelled    
            this.skres.createResource(res.path, res.data);        
            this.focusMap();
        });        
    }

    // ** show login dialog **
    public showLogin(message?:string, cancelWarning:boolean=true, onConnect?:boolean):Observable<any> {
        let lis:Subject<boolean>= new Subject();
        this.dialog.open(LoginDialog, {
            disableClose: true,
            data: { message: message || 'Login to Signal K server.'}
        }).afterClosed().subscribe( res=> {
            if(!res.cancel) {
                this.signalk.login(res.user, res.pwd).subscribe(
                    r=> {   // ** authenticated
                        this.app.persistToken(r['token']);
                        this.app.loadSettingsfromServer().subscribe( r=> {
                            let msg= (r) ? 'Settings loaded from server.' :
                            'Error loading Settings from server!';
                            console.log(msg);
                             if(r) { this.skres.alignResourceSelections() }
                        });
                        if(onConnect) { this.queryAfterConnect() }
                        this.app.data.loggedIn= true;
                        lis.next(true);
                    },
                    err=> {   // ** auth failed
                        this.app.persistToken(null);
                        this.signalk.isLoggedIn().subscribe( r=> {this.app.data.loggedIn= r});
                        if(onConnect) { 
                            this.app.showConfirm(
                                'Invalid Username or Password.', 
                                'Authentication Failed:',
                                'Try Again'
                            ).subscribe( r=> { this.showLogin(null, false, true) });
                        }
                        else { 
                            this.app.showConfirm(
                                'Invalid Username or Password.\nNote: Choosing CLOSE may make operations requiring authentication unavailable.', 
                                'Authentication Failed:',
                                'Try Again',
                                'Close'
                            ).subscribe( r=> { if(r) { this.showLogin() } }); 
                        }
                    }
                );
            }
            else { 
                this.app.data.hasToken= false; // show login menu item
                this.signalk.isLoggedIn().subscribe( r=> {this.app.data.loggedIn= r});
                if(onConnect) { this.showLogin(null, false, true) }
                else {
                    if(cancelWarning) {
                        this.app.showAlert(
                            'Login Cancelled:', 
                            `Update operations are NOT available until you have authenticated to the Signal K server.`);
                    }
                    lis.next(false);
                }
            }
            this.focusMap();
        });   
        return lis.asObservable();     
    }

    public showPlaybackSettings() {
        this.dialog.open(PlaybackDialog, {
            disableClose: false
        }).afterClosed().subscribe( r=> {
            if(r.result) { // OK: switch to playback mode
                this.switchMode(SKSTREAM_MODE.PLAYBACK, r.query);
            }
            else {  // cancel: restarts realtime mode
                this.switchMode(SKSTREAM_MODE.REALTIME);
            }
            this.focusMap();
        });
    }
 

    // ********** TOOLBAR ACTIONS **********

    public openAlarmsDialog() { 
        if(this.app.data.loginRequired && !this.app.data.loggedIn) {
            this.showLogin(null,false,false).subscribe( r=> {
                if(r) { this.openAlarmsDialog() }
            });
        }
        else {
            this.dialog.open(AlarmsDialog, { disableClose: true })
            .afterClosed().subscribe( ()=> this.focusMap() );
        }
    }

    public toggleMoveMap(exit:boolean=false) { 
        let doSave:boolean= (!this.app.config.map.moveMap && exit) ? false : true;
        this.app.config.map.moveMap= (exit) ? false : !this.app.config.map.moveMap;
        if(doSave) { this.app.saveConfig() }
    }

    public toggleNorthUp() { 
        this.app.config.map.northUp= !this.app.config.map.northUp;
        this.app.saveConfig();
    } 

    // ***** EDIT MENU ACTONS *******

    // ** Enter Draw mode **
    public drawStart(mode:string, props?:any) {
        this.draw.properties= (props && props.group) ? props : {};
        this.draw.mode= mode;
        this.draw.enabled= true;
    }

    // ** Enter Measure mode **
    public measureStart() { this.measure.enabled=true } 

    // ***** OPTIONS MENU ACTONS *******  

    public centerResource(position:[number,number], zoomTo?:number) { 
        position[0]+=0.0000000000001;
        this.display.map.center= position;
        if(typeof zoomTo==='number') { this.app.config.map.zoomLevel=zoomTo }
    }

    public centerVessel() { 
        let t=this.app.data.vessels.active.position;
        t[0]+=0.0000000000001;
        this.display.map.center= t;
    }

    public toggleAisTargets() { 
        this.app.config.aisTargets= !this.app.config.aisTargets;
        if(this.app.config.aisTargets) { this.processAIS(true) }
        this.app.saveConfig();
    }

    public toggleCourseData() { 
        this.app.config.courseData= !this.app.config.courseData;
        this.app.saveConfig();
    }  
    
    public toggleNotes() { 
        this.app.config.notes= !this.app.config.notes;
        this.app.saveConfig();
    }

    // ** delete vessel trail **
    public clearTrail(noprompt:boolean=false) {
        if(noprompt) { 
            if(!this.app.data.serverTrail) { this.app.data.trail=[] }
            else { 
                if(this.app.config.selections.trailFromServer) {
                    this.skres.getVesselTrail();    // request trail from server
                }
            }
        }
        else {
            if(!this.app.data.serverTrail)
            this.app.showConfirm(
                'Clear Vessel Trail',
                'Do you want to delete the vessel trail?'
            ).subscribe( res=> { 
                if(res) { 
                    if(!this.app.data.serverTrail) { this.app.data.trail=[] }
                    else {                 
                        if(this.app.config.selections.trailFromServer) {
                            this.skres.getVesselTrail();    // request trail from server
                        }
                    }
                }
            }); 
        }   
    }

    // ** clear course / navigation data **
    public clearCourseData() {
        let idx= this.app.data.navData.pointIndex;
        this.app.data.navData= {
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

    // ** clear active destination **
    public deactivateRoute() { 
        if(this.app.data.activeRoute) { 
            this.skres.clearActiveRoute(this.app.data.vessels.activeId);
        }
        else {
            this.skres.setNextPoint(null);
            this.app.data.activeWaypoint= null;
            this.app.data.navData.pointNames= [];
        }
        
    }   

    // ********** MAP / UI ACTIONS **********

    // ** set active route **
    public activateRoute(id:string) { this.skres.activateRoute(id, this.app.data.vessels.activeId) }   
   
    // ** Set active route as nextPoint **
    public routeNextPoint(i:number) {
        let c= this.skres.getActiveRouteCoords();
        let idx:number;
        if(i==-1) {
            if(this.app.data.navData.pointIndex==-1) {
                idx=0;
            }
            else if(this.app.data.navData.pointIndex>0) {
                idx= this.app.data.navData.pointIndex-1;
            }
            else { return }
        }
        else { // +1
            if(this.app.data.navData.pointIndex==-1) {
                idx== c.length-1;
            }
            else if(this.app.data.navData.pointIndex<this.app.data.navData.pointTotal-1) {
                idx= this.app.data.navData.pointIndex+1;
            }
            else { return }
        }
        let nextPoint= {
            latitude: c[idx][1], 
            longitude: c[idx][0], 
        }
        if(Array.isArray(this.app.data.navData.pointNames) && this.app.data.navData.pointNames.length!=0) {
            let idx= (this.app.data.navData.pointIndex==-1) ? 0 : this.app.data.navData.pointIndex;
            this.app.data.navData.destpointName= this.app.data.navData.pointNames[idx];
        }
        else { this.app.data.navData.destpointName= '' }

        this.skres.setNextPoint(nextPoint);  
        this.focusMap();   
    }     

    // ** show feature (vessel/AtoN/ActiveRoute) properties **
    public featureProperties(e:any) {
        let v: any;
        if(e.type=='dest') { 
            let dtype= e.id.split('.')[1];
            if(dtype=='point') { // Point
                v= this.skres.buildWaypoint(this.app.data.navData.position);
            }
            else {  // route
                v= this.app.data.routes.filter(i=>{ return e.id== i[0] ? true : false })[0];
            }
            if(v) {
                this.bottomSheet.open(ActiveResourcePropertiesModal, {
                    disableClose: true,
                    data: {
                        title: 'Destination Properties',
                        resource: v,
                        type: dtype,
                        skres: this.skres
                    }
                }).afterDismissed().subscribe( (deactivate: boolean)=> { 
                    if(deactivate) { this.deactivateRoute() }
                    this.focusMap();
                });
            }         
        }
        else if(e.type=='route') { 
            v= this.app.data.routes.filter(i=>{ return e.id== i[0] ? true : false })[0];
            if(v) {
                this.bottomSheet.open(ActiveResourcePropertiesModal, {
                    disableClose: true,
                    data: {
                        title: 'Route Properties',
                        resource: v,
                        type: e.type,
                        skres: this.skres
                    }
                }).afterDismissed().subscribe( ()=> this.focusMap() );
            }         
        }        
        else if(e.type=='aton') { 
            let title:string;
            let icon:string;
            if(e.id.slice(0,3)=='sar') {
                v= this.app.data.sar.get(e.id);
                title= 'SaR Properties';
                icon= 'tour';
            }
            else { 
                v= this.app.data.atons.get(e.id);
                title= 'AtoN Properties';
                icon= 'beenhere';
            }
            if(v) {
                this.bottomSheet.open(AtoNPropertiesModal, {
                    disableClose: true,
                    data: {
                        title: title,
                        target: v,
                        id: e.id,
                        icon: icon
                    }
                }).afterDismissed().subscribe( ()=> this.focusMap() );
            }         
        }        
        else if(e.type=='aircraft') { 
            v= this.app.data.aircraft.get(e.id);
            if(v) {
                this.bottomSheet.open(AircraftPropertiesModal, {
                    disableClose: true,
                    data: {
                        title: 'Aircraft Properties',
                        target: v,
                        id: e.id
                    }
                }).afterDismissed().subscribe( ()=> this.focusMap() );
            }         
        }             
        else {
            v= (e.type=='self') ? this.app.data.vessels.self 
                : this.app.data.vessels.aisTargets.get(e.id);
            if(v) {
                this.bottomSheet.open(AISPropertiesModal, {
                    disableClose: true,
                    data: {
                        title: 'Vessel Properties',
                        target: v,
                        id: e.id
                    }
                }).afterDismissed().subscribe( ()=> this.focusMap() );
            }
        }
    }   
    
    // ** handle drag and drop of files onto map container**
    public mapDragOver(e:any) { e.preventDefault() }

    public mapDrop(e:any) {  
        e.preventDefault();
        if (e.dataTransfer.files) {
            if( e.dataTransfer.files.length>1 ) { 
                this.app.showAlert('Load Resources', 'Multiple files provided!\nPlease select only one file for processing.');
            }
            else {
                let reader = new FileReader();
                reader.onerror= err=> { 
                    this.app.showAlert('File Load error', `There was an error reading the file contents!`);
                }  
                if(!e.dataTransfer.files[0].name) { return }  
                let fname= e.dataTransfer.files[0].name;            
                reader.onload= ()=> { this.processGPX({ name: fname, data: reader.result}) }
                reader.readAsText(e.dataTransfer.files[0]);
            }
        } 
    }  

    // ** process / cleanup AIS targets
    private processAIS(toggled?: boolean) {
        if(!this.app.config.aisTargets && !toggled) { return }
        if(toggled) { // ** re-populate list after hide
            this.app.data.vessels.aisTargets.forEach( (v,k)=>{
                this.app.data.aisMgr.updateList.push(k);
            });
        }
    }
    
    // ********* MODE ACTIONS *************

    // ** set the active vessel to the supplied UUID **
    public switchActiveVessel(uuid: string=null) {
        this.app.data.vessels.activeId= uuid;
        if(!uuid) { this.app.data.vessels.active= this.app.data.vessels.self }
        else {
            let av= this.app.data.vessels.aisTargets.get(uuid);
            if(!av) {
                this.app.data.vessels.active= this.app.data.vessels.self;
                this.app.data.vessels.activeId= null;
            }
            else { 
                this.app.data.vessels.active= av;
                // if instrument panel open - close it
                this.sideright.close();
            }
        }
        this.app.data.activeRoute= null;
        this.clearTrail(true);
        this.clearCourseData();
        this.alarmsFacade.queryAnchorStatus(this.app.data.vessels.activeId, this.app.data.vessels.active.position);
        this.skres.getRoutes(uuid); // get activeroute from active vessel
        this.alarmsFacade.alarms.clear(); // reset displayed alarm(s)

        this.app.debug(`** Active vessel: ${this.app.data.vessels.activeId} `);
        this.app.debug(this.app.data.vessels.active);
    }

    // ** switch between realtime and history playback modes
    public switchMode(toMode: SKSTREAM_MODE, query:any='none') {
        this.app.debug(`switchMode from: ${this.mode} to ${toMode}`);
        if(toMode== SKSTREAM_MODE.PLAYBACK) { // ** history playback
            this.app.db.saveTrail('self', this.app.data.trail);
            this.app.data.trail= [];
        }
        else {  // ** realtime data
            this.app.db.getTrail('self').then( t=> { 
                this.app.data.trail= (t && t.value) ? t.value : [];
            });
        }
        this.switchActiveVessel();
        this.openSKStream(query, toMode, true);
    }   
    
    // ** show select mode dialog
    public showSelectMode() {
        if(this.mode== SKSTREAM_MODE.REALTIME) { // request history playback
            this.app.showConfirm(
                'Do you want to change to History Playback mode?', 
                'Switch Mode' 
            ).subscribe( r=> { if(r) { this.showPlaybackSettings() } });         
        }
        else {  // request realtime
            this.app.showConfirm(
                'Do you want to exit History Playback mode?', 
                'Exit History Playback' 
            ).subscribe( r=> { if(r) { this.switchMode(SKSTREAM_MODE.REALTIME) } });  
        }
    }    

    // ******** DRAW / EDIT EVENT HANDLERS ************

    // ** handle modify start event **
    public handleModifyStart(e:any) {
        this.draw.type= null
        this.draw.mode= null;
        this.draw.enabled= false;
        this.draw.modify= true;      
        this.draw.forSave= { id: null, coords: null}  
    }

    // ** handle modify end event **
    public handleModifyEnd(e:any) {
        this.draw.forSave= e;
        this.app.debug(this.draw.forSave);
    }  
     
    // ** Draw end event **
    public handleDrawEnd(e:any) {
        this.draw.enabled=false;
        switch(this.draw.mode) {
            case 'note':   
                let params= {position: e.coordinates};
                if(this.draw.properties['group']) { params['group']= this.draw.properties['group'];}
                this.skres.showNoteEditor(params);
                break;
            case 'waypoint':         
                this.skres.showWaypointEditor({position: e.coordinates});
                break;
            case 'route':
                this.skres.showRouteNew({coordinates: e.coordinates});
                break;
            case 'region':  // region + Note
                let region= new SKRegion();
                let uuid= this.signalk.uuid.toSignalK();
                region.feature.geometry.coordinates= [GeoUtils.normaliseCoords(e.coordinates)];
                this.skres.showNoteEditor({region: {id:uuid, data: region }})
                break;                
        }
        // clean up
        this.draw.mode=null;
        this.draw.modify=false;
    }
      
    // ** End Draw / modify / Measure mode **
    public cancelDraw() {
        if(this.draw.modify && this.draw.forSave && this.draw.forSave.id) {  // save changes
            this.app.showConfirm(
                `Do you want to save the changes made to ${this.draw.forSave.id.split('.')[0]}?`, 
                'Save Changes'
            ).subscribe( res=> {
                let r= this.draw.forSave.id.split('.');
                if(res) {   // save changes
                    if(r[0]=='route') { 
                        this.skres.updateRouteCoords(r[1], this.draw.forSave.coords);
                        this.stream.setNavData(this.draw.forSave.coords); 
                    }
                    if(r[0]=='waypoint') {
                        this.skres.updateWaypointPosition(r[1], this.draw.forSave.coords);
                        // if waypoint the target destination update nextPoint
                        if(r[1]==this.app.data.activeWaypoint) {
                            this.skres.setNextPoint({
                                latitude: this.draw.forSave.coords[1], 
                                longitude: this.draw.forSave.coords[0], 
                            });  
                        }
                    }
                    if(r[0]=='note') { 
                        this.skres.updateNotePosition(r[1], this.draw.forSave.coords);
                    }         
                    if(r[0]=='region') { 
                        this.skres.updateRegionCoords(r[1], this.draw.forSave.coords);
                    }                                 
                }
                else {
                    if(r[0]=='route') { this.skres.getRoutes(this.app.data.vessels.activeId) }
                    if(r[0]=='waypoint') { this.skres.getWaypoints() }
                    if(r[0]=='note' || r[0]=='region') { this.skres.getNotes() }
                }
                this.draw.forSave= null;
                this.focusMap();
            });
        }
        // clean up
        this.draw.enabled=false;
        this.draw.mode=null;
        this.draw.modify=false;
        this.measure.enabled=false;
    }  

    // ******** SIGNAL K STREAM *************

    // ** fetch resource types from server **
    fetchResources(allTypes:boolean=false) {   
        this.skres.getRoutes(this.app.data.vessels.activeId); // + get ActiveRoute Info. See associated message handler
        this.skres.getWaypoints();
        this.skres.getCharts();  
        this.skres.getNotes();
        if(allTypes) { this.fetchOtherResources(true) }
    } 

    // ** fetch non-standard resources from server **
    fetchOtherResources(onlySelected:boolean=false) {  
        this.skres.getTracks(onlySelected);
        this.app.config.resources.paths.forEach( i=> {
            this.skOtherRes.getItems(i, onlySelected);
        });
    }

    // ** open WS Stream 
    private openSKStream(options:any=null, toMode: SKSTREAM_MODE=SKSTREAM_MODE.REALTIME, restart:boolean=false) { 
        if(restart) {
            this.streamOptions= {options:options, toMode: toMode};
            this.stream.close();
            return;
        }
        this.stream.open(options, toMode);
    }

    // ** query server for current values **
    private queryAfterConnect() {
        // ** get login status
        this.signalk.getLoginStatus().subscribe( r=> {
            this.app.data.loginRequired= r.authenticationRequired ?? false;
        });
        this.signalk.isLoggedIn().subscribe( r=> {this.app.data.loggedIn= r});
        // ** get vessel details
        let context= (this.app.data.vessels.activeId) ? 
            this.app.data.vessels.activeId.split('.').join('/') : 'vessels/self';
        this.signalk.api.getSelf().subscribe(
            r=> {  
                this.stream.post({ cmd: 'vessel', options: {context: 'self', name: r['name']} });
                this.fetchResources(true);  // ** fetch all resource types from server
                if(this.app.config.selections.trailFromServer) {
                    this.skres.getVesselTrail();    // request trail from server
                }
                // ** query anchor alarm status
                this.alarmsFacade.queryAnchorStatus(this.app.data.vessels.activeId, this.app.data.vessels.active.position);
            },
            err=> { 
                if(err.status && err.status==401) { this.showLogin(null, false, true) }  
                this.app.debug('No vessel data available!') 
            }
        );          
    }

    // ** handle connection established
    private onConnect(e?:any) {
        this.app.showMessage('Connection Open.', false, 2000);
        this.app.debug(e);
        // ** query server for status
        this.queryAfterConnect();
        // ** start trail timer
        this.startTimers();
    }

    // ** handle connection closure
    private onClose(e?:any) {
        this.app.debug('onClose: STREAM connection closed...');
        this.app.debug(e);
        this.stopTimers();
        if(e.result) { // closed by command then restart
            this.openSKStream(this.streamOptions.options, this.streamOptions.toMode);
        }
        else {
            let data= { title: 'Connection Closed:', buttonText: 'Re-connect', message: ''};
            if(e.playback) { 
                data.buttonText= 'OK'
                data.message= 'Unable to open Playback connection.';

                this.app.showAlert(
                    data.message,
                    data.title,
                    data.buttonText
                ).subscribe( ()=>{ 
                    if(this.mode==SKSTREAM_MODE.REALTIME) { this.switchMode(this.mode) } 
                    else { this.showPlaybackSettings() }
                });                
            }
            else { 
                if(!this.reconnecting) {
                    this.reconnecting= true;
                    setTimeout( 
                        ()=> { 
                            this.reconnecting= false;
                            this.openSKStream(this.streamOptions.options, this.mode);
                        },
                        5000
                    )
                }
            }
        }  
    }

    private reconnecting: boolean= false;
    
    // ** handle error message
    private onError(e:any) { 
        this.app.showMessage('Connection Error!', false, 2000);
        console.warn('Stream Error!', e);
    }
    
    // ** handle delta message received
    private onMessage(e:any) { 
        if(e.action=='hello') { // ** hello message
            this.app.debug(e); 
            if(e.playback) { this.mode= SKSTREAM_MODE.PLAYBACK }
            else { 
                this.mode= SKSTREAM_MODE.REALTIME;
                this.stream.subscribe();
            }
            this.app.data.selfId= e.self;
            return;
        }
        else if(e.action=='update') { // delta message
            if(this.mode==SKSTREAM_MODE.PLAYBACK) { 
                let d= new Date(e.timestamp);
                this.display.playback.time= `${d.toDateString().slice(4)} ${d.toTimeString().slice(0,8)}`;
            }   
            else { 
                this.display.playback.time= null;
                this.setDarkTheme();
                if(e.result.self.resourceUpdates && e.result.self.resourceUpdates.length!=0) {
                    this.skres.processDelta(e.result.self.resourceUpdates);
                }
            }   
            this.updateNavPanel();
        }  
    }   

    // ** Update NavData Panel display **
    private updateNavPanel(msg?:any) {
        this.display.navDataPanel.show= (this.app.data.activeRoute || 
            this.app.data.activeWaypoint || this.app.data.navData.position) ? true : false;
        
        this.display.navDataPanel.nextPointCtrl= (this.app.data.activeRoute) ? true : false;

        //autopilot
        let apModeOk= ['auto', 'noDrift', 'wind', 'depthContour', 'route', 'directControl'];
        if(this.app.data.vessels.self.autopilot.state=='standby') {
            this.display.navDataPanel.apModeColor= 'accent';
        }
        else if(this.app.data.vessels.self.autopilot.state=='alarm') {
            this.display.navDataPanel.apModeColor= 'warn';
        }
        else if(apModeOk.includes(this.app.data.vessels.self.autopilot.state) ) {
            this.display.navDataPanel.apModeColor= 'primary';
        }
        else { this.display.navDataPanel.apModeColor= '' }
        this.display.navDataPanel.apModeText= (this.app.data.vessels.self.autopilot.state) ? 
            'Autopilot: ' + this.app.data.vessels.self.autopilot.state : ''
    }

}
