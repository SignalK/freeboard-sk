/** Application Information Service **
 * perform version checking etc. here
 * ************************************/
import { Injectable } from '@angular/core';
import { Info } from './lib/app-info';
import { Subject } from 'rxjs';
import {IndexedDB} from './lib/info/indexeddb';


@Injectable({
    providedIn: 'root'
})
export class AppInfo extends Info {

    private DEV_SERVER= {
        host: null,     // host name || ip address
        port: null,     // port number
        ssl: null       // true || false
    }

    public hostName;
    public hostPort: number;
    public hostSSL: boolean;
    public host= ''; 

    public db: AppDB;

    constructor() {
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
        this.version= '1.0.0';
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
            usePUT: true,
            vesselTrail: false,
            aisTargets: true,
			courseData: false,
            depthAlarm: { enabled: false, smoothing: 10000 },
            plugins: {
                instruments: '/@signalk/instrumentpanel'
            },
            units: {        // ** display units
                distance: 'm',
                depth: 'm',
                speed: 'kn'
            },
            selections: {   // ** selected resources 
                routes: [],
                waypoints: [],
                charts: ['openstreetmap','openseamap'],
                headingAttribute: 'navigation.headingTrue'
            }
        } 

        this.data= {        // ** received data
            routes: [],
            waypoints: [],
            charts: [],
            alarms: [],
            selfId: null,
            activeRoute: null,
            trail: [],
            server: null
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
        // ** do stuff here ** 
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
}