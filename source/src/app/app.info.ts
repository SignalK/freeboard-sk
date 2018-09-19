/** Application Information Service **
 * perform version checking etc. here
 * ************************************/
import { Injectable } from '@angular/core';
import { Info } from './lib/app-info';


@Injectable({
    providedIn: 'root'
})
export class AppInfo extends Info {

    private DEVHOST=  `192.168.99.100`;
    //private DEVHOST=  `192.168.86.32`;

    public hostName;
    public hostPort: number;
    public hostSSL: boolean;
    public host= ''; 

    constructor() {
        super();
        this.hostName= (this.devMode) ? this.DEVHOST : window.location.hostname;
        this.hostPort= (this.devMode) ? 3000 : parseInt(window.location.port);
        this.hostSSL= (window.location.protocol=='https:') ? true : false;

        this.host= (this.devMode) ? 
            `${window.location.protocol}//${this.hostName}:${this.hostPort}` :
            `${window.location.protocol}//${window.location.host}`;
            
        this.id='freeboard';
        this.name= "Freeboard";
        this.shortName= "freeboard";
        this.description= `Signal K Chart Plotter.`;
        this.version= '0.1.0';
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
            vessels: new Map(),
            selfId: null,
            activeRoute: null,
            trail: []
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