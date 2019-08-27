/** Application Information Service **
 * perform version checking etc. here
 * ************************************/
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AlertDialog, ConfirmDialog, MessageBarComponent } from './lib/app-ui';

import { Info } from './lib/app-info';
import { Subject } from 'rxjs';
import { IndexedDB } from './lib/info/indexeddb';
import { SignalKClient } from 'signalk-client-angular';
import { SKVessel } from './modules/skresources/resource-classes';

@Injectable({ providedIn: 'root' })
export class AppInfo extends Info {

    private DEV_SERVER= {
        host: null,     // host name || ip address
        port: null,                 // port number
        ssl: false
    };

    public hostName: string;
    public hostPort: number;
    public hostSSL: boolean;
    public host= '';

    public db: AppDB;

    get useMagnetic(): boolean { 
        return  (this.config.selections.headingAttribute=='navigation.headingMagnetic') ? true : false;
    }

    constructor( public signalk: SignalKClient,
                private dialog: MatDialog,
                private snackbar: MatSnackBar) {
        super();

        this.db= new AppDB();

        this.hostName= (this.devMode && this.DEV_SERVER.host) ? this.DEV_SERVER.host : window.location.hostname;
        this.hostPort= (this.devMode && this.DEV_SERVER.port) ? this.DEV_SERVER.port : parseInt(window.location.port);
        this.hostSSL= (window.location.protocol=='https:' || 
                        (this.devMode && this.DEV_SERVER.ssl) ) ? true : false;

        this.host= (this.devMode) ? 
            `${this.hostSSL ? 'https:' : 'http:'}//${this.hostName}:${this.hostPort}` :
            `${window.location.protocol}//${window.location.host}`;

        this.id='freeboard';
        this.name= "Freeboard";
        this.shortName= "freeboard";
        this.description= `Signal K Chart Plotter.`;
        this.version= '1.5.2';
        this.url= 'https://github.com/signalk/freeboard-sk';
        this.logo= "./assets/img/app_logo.png";       
        
        this.config= {      // ** base config
            version: '',
            map: {          // ** map config
                zoomLevel: 2,
                center: [0, 0],
                rotation: 0,
                mrid: null,
                srid: 'EPSG:4326',
                moveMap: false,
                northUp: true
            },
            anchor: {       // ** anchor watch
                raised: true,
                radius: 40,
                position: [0,0]
            },
            vesselTrail: false,     // display trail
            aisTargets: true,       // display ais targets
            courseData: false,      // display course data
            notes: false,           // display notes
            depthAlarm: { enabled: false, smoothing: 10000 },
            plugins: {
                instruments: '/@signalk/instrumentpanel',
                startOnOpen: false
            },
            units: {        // ** display units
                distance: 'm',
                depth: 'm',
                speed: 'kn'
            },
            selections: {   // ** saved selections 
                routes: [],
                waypoints: [],
                charts: ['openstreetmap','openseamap'],
                notes: [],
                headingAttribute: 'navigation.headingTrue',
                aisTargets: null,
                aisWindApparent: false,
                aisWindMinZoom: 15,
                notesMinZoom: 10
            },
            resources: {    // ** resource options
                notes: {
                    rootFilter: '?position=%map:latitude%,%map:longitude%&dist=%note:radius%',     // param string to provide record filtering
                    getRadius: 20,      // radius (NM/km) within which to return notes
                    groupNameEdit: false,
                    groupRequiresPosition: false
                }
            }
        } 

        this.data= {        // ** received data
            routes: [],
            waypoints: [],
            charts: [],
            alarms: new Map(),
            notes: [],
            selfId: null,
            activeRoute: null,
            activeWaypoint: null,
            trail: [],
            server: null,
            hasToken: false,
            headingValues: [],
            lastGet: null,      // map position of last resources GET
            vessels: {          // received vessel data
                showSelf: false,
                selfProperties: { name: null, mmsi: null, callsign: null },
                self: new SKVessel(), 
                aisTargets: new Map(),
                activeId: null,
                active: null,
                closest: {id: null, distance: null, timeTo: null, position: [0,0]}
            },
            aisMgr: {                   // manage aisTargets
                maxAge: 540000,         // time since last update in ms (9 min)
                staleAge: 360000,       // time since last update in ms (6 min)
                updateList: [],
                staleList: [],
                removeList: []
            },
            navData: {
                vmg: null,
                dtg: null,
                ttg: null,
                bearing: {value: null, type: null},
                bearingTrue: null,
                bearingMagnetic: null,
                xte: null,
                position: null,
                pointIndex: -1,
                pointTotal: 0
            }
        }

        /***************************************
         * Subscribe to App events as required
         ***************************************/
        // ** version update **   
        this.upgraded$.subscribe( version=> {
            this.handleUpgradeEvent(version)
        });
        // ** settings load / save events
        this.settings$.subscribe( value=> {
            this.handleSettingsEvent(value);
        });    
        // ** database events
        this.db.dbUpdate$.subscribe( res=> {
            if(res.action) {
                switch(res.action) {
                    case 'db_init':
                        if(res.value) { 
                            if(this.config.vesselTrail) {
                                this.db.getTrail().then( t=> { 
                                    this.data.trail= (t && t.value) ? t.value : [];
                                });
                            }
                            this.db.getAuthToken()
                            .then( t=> { 
                                if(t && t.value) {
                                    this.signalk.authToken= t.value;
                                    this.data.hasToken= true;
                                }
                            });
                        }
                        break;
                    case 'trail_save':
                        if(!res.value) { this.debug('app.trail.save.error', 'warn') }
                        break;                        
                }
            }
        });            
        this.init();    

        /***************************************
         * trigger app version check
         * uses: handleUpgradeEvent() subscription
         ***************************************/
        let v= this.checkVersion();
        if(!v.result) { //** current version
            this.loadConfig();
            this.loadData();            
        }
    } 

    // ** handle App version upgrade **
    handleUpgradeEvent(version) { 
        this.debug('App Upgrade Handler...Start...', 'info');
        this.debug(version);
        // *******************
		
        if( version.result && version.result=='update' ) {
            this.debug('Upgrade result....new version detected');
            // side-load persisted config / data 
            let lconfig=(this.state.loadConfig());       
            let ldata=(this.state.loadData());    
            // transform config / data as required here    

            // apply to this.config / this.data
        }
        else if( version.result && version.result=='new' ) {
            this.debug('Upgrade result....new installation');
            this.loadConfig();
            this.loadData();
            this.data['firstRun']=true;
        }        
        
        // *******************
        this.saveInfo();
        this.debug('App Upgrade Handler...End...', 'info');
    } 

    // ** handle Settings load / save **
    handleSettingsEvent(value) {
        this.debug(value);
        if(value.action=='load' && value.setting=='config') {
            if(typeof this.config.usePUT !== 'undefined') { delete this.config.usePUT }
            if(typeof this.config.selections.aisWindMinZoom === 'undefined') {
                this.config.selections.aisWindMinZoom=15;
            }
            if(typeof this.config.selections.aisWindApparent === 'undefined') {
                this.config.selections.aisWindApparent= false;
            }
            if(typeof this.config.selections.notesMinZoom === 'undefined') {
                this.config.selections.notesMinZoom=10;
            }   
            if(typeof this.config.resources === 'undefined') {
                this.config.resources= { 
                    notes: {
                        rootFilter: '?position=%map:latitude%,%map:longitude%&dist=%note:radius%',     
                        getRadius: 20,     
                        groupNameEdit: false,
                        groupRequiresPosition: false
                    }
                }
            }                              
        }
    }

    // ** display alert dialog
    showAlert(title:string, message:string, btn?:string) {
        return this.dialog.open(AlertDialog, {
            disableClose: false,
            data: { 
                message: message, 
                title: title,
                buttonText: btn 
            }
        }).afterClosed();        
    } 

    // ** display message bar
    showMessage(message:string, sound:boolean=false, duration:number=5000) {
        this.snackbar.openFromComponent( MessageBarComponent, 
            { 
                duration: duration,
                data: { message: message, sound: sound }
            }
        );        
    } 
    
    // ** display confirm dialog **
    showConfirm(message:string, title:string, btn1?:string, btn2?:string) {
        return this.dialog.open(ConfirmDialog, {
            disableClose: true,
            data: { 
                message: message, 
                title: title,
                button1Text: btn1,
                button2Text: btn2
            }
        }).afterClosed();
    }

}

/******************
** App Database  **
******************/
export class AppDB {

    private db: IndexedDB; 
    private dbUpdateSource;
    public dbUpdate$;

	constructor() {
		this.dbUpdateSource= new Subject<string>();
        this.dbUpdate$ = this.dbUpdateSource.asObservable();
		this.db= new IndexedDB('freeboard', 1);

        this.db.openDatabase(1, (evt) => {
            let trail = evt.currentTarget.result.createObjectStore('trail', {keyPath: 'uuid'});
            trail.createIndex('uuid_idx', 'uuid', {unique: true});
        }).then( 
            ()=> { this.emitDbUpdate({action: 'db_init', value: true}) },
            e=> { this.emitDbUpdate({action: 'db_init', value: false}) }
        );
	}

	// ** emit dbUpdate message **
    emitDbUpdate(value: any= null) { this.dbUpdateSource.next(value) }

	// ** get veesel trail **
	getTrail(id='self') { return this.db.getByIndex('trail', 'uuid_idx', id) }

	// ** create / update vessel trail entry**
	saveTrail(id='self', trailData) {
        this.db.update( 'trail', {uuid: id, value: trailData}).then(
            () => { this.emitDbUpdate({action: 'trail_save', value: true}) }, 
            (e)=> { 
                this.db.add( 'trail', {uuid: id, value: trailData}).then( 
                    () => { this.emitDbUpdate({action: 'trail_save', value: true}) }, 
                    e=> { this.emitDbUpdate({action: 'trail_save', value: false}) }
                );
            }
        );
    } 

    // ** retrieve token **
    getAuthToken() { return this.db.getByIndex('trail', 'uuid_idx', 'token') }

	// ** save token **
	saveAuthToken(token) {
        this.db.update( 'trail', {uuid: 'token', value: token}).then(
            () => { }, 
            (e)=> { 
                this.db.add( 'trail', {uuid: 'token', value: token}).then( 
                    () => { }, 
                    e=> { }
                );
            }
        );
    }    
}