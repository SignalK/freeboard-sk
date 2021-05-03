/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';

@Injectable({ providedIn: 'root' })
export class SettingsFacade  {

    // **************** Settings Dialog Support ***************************
    private symDegree= String.fromCharCode(186);
    availableUnits= {
        distance: new Map([ 
            ['m', 'Kilometres'], ['ft', 'Nautical Miles']
        ]),
        depth: new Map([ 
            ['m', 'metres'], ['ft', 'feet']
        ])
    }   

    preferredValues= {
        heading: [ 
            ['navigation.headingTrue', 'True'], ['navigation.headingMagnetic', 'Magnetic']
        ],
        wind: new Map([ 
            [false, 'Wind True'], [true, 'Wind Apparent']
        ]),
        coords: [ 
            ['XY','-28.12345'],
            ['SHDd',`S-28.12345${this.symDegree}`],['HDd',`S 28.12345${this.symDegree}`],
            ['HDMS',`S 28${this.symDegree}15'46"123`],['DHMS',`28S15'46"123`] 
        ]      
    }

    list= {
        minZoom: [8,9,10,11,12,13,14,15,16,17],
        resourceRadius: [ 5, 10,20, 50, 100, 150, 200, 500 ],
        applications: [],
        favourites: [],
        resourcePaths: [],
        aisTimeouts: new Map( [ [60000,'1 min'],[120000,'2 min'],[180000,'3 min'],[360000,'6 min'],[540000,'9 min'] ]),
        aisMaxRadius: new Map( [ [0,'None'],[10000,'5 NM (10km)'],[20000,'10 NM (20km)'],[30000,'15 NM (30km)'],[40000,'20 NM (40km)'],[50000,'25 NM (50km)'],[75000,'40 NM (75km)'],[100000,'55 NM (100km)'] ]),
        aisProfiles: new Map( [ [0,'Default'],[1,'Navigation'] ])
    }

    alarmOptions= {
        smoothing: new Map( [ [5000,'5 secs'],[10000,'10 secs'],[20000,'20 secs'],[30000,'30 secs'] ])
    }

    darkModeOptions= new Map( [ 
        [0,'Use OS setting'], 
        [1,'Use Signal K Mode'], 
        [-1,'On'] 
    ]);
       

    // *****************************************************
    settings:any= this.app.config;
    data:any= this.app.data;

    update$() { return this.app.settings$ }
    saved$() { return this.configSavedSource.asObservable() }
    loaded$() { return this.configLoadedSource.asObservable() }

    // ******************************************************
    private configSavedSource= new Subject<any>();
    private configLoadedSource= new Subject<any>();
   // *******************************************************    

    constructor(private app: AppInfo, 
                public signalk: SignalKClient) { 
        this.app.settings$.subscribe( r=> {
            if(r.setting=='config') {
                if(r.action=='load') { this.configLoadedSource.next(r) }
                if(r.action=='save') { this.configSavedSource.next(r) }
            }
        })

    }

    // refresh dynamic data from sources
    refresh() { 
        this.settings= this.app.config;
        this.getApps();
        this.getResourcePaths();
    }

    // ** populate list of available non-standard resource paths
    private getResourcePaths() {
        this.signalk.api.get('resources').subscribe(
            (r:Array<string>)=> { 
                this.list.resourcePaths= r.filter( i=> { 
                    return !['routes','waypoints','notes','regions','charts'].includes(i);
                }).sort();
            },
            ()=> this.list.resourcePaths= []
        );
    }

    // ** populate applications list **
    private getApps() {
        // apps list - default an entry to stored config value
        if(this.app.config.plugins.instruments) { 
            this.list.applications.push(this.app.config.plugins.instruments);
        } 

        this.signalk.apps.list().subscribe( 
            (a: Array<any>)=> {
                this.list.applications= a.map( i=> { 
                    if(i.name=='@signalk/freeboard-sk') { return null }
                    if(!i._location && !i.location) { // npm linked app
                        return {
                            name: i.name,
                            description: i.description, 
                            url: `/${i.name}`
                        }                    
                    }
                    if(typeof i._location!=='undefined') { // legacywebapps list
                        let x= i._location.indexOf('/signalk-server/');
                        return {
                            name: i.name,
                            description: i.description, 
                            url: (x==-1) ? i._location : i._location.slice(15)
                        }
                    }
                    else if(typeof i.location!=='undefined') {
                        return {
                            name: i.name,
                            description: i.description, 
                            url: i.location
                        }                        
                    }
                }).filter(e=> {return e} );

                this.list.applications.unshift({
                    name:  'None',
                    description: '', 
                    url: null
                });

                this.buildFavouritesList();
            },
            err=> { this.app.debug('ERROR retrieving AppList!') }
        );
    } 

    // ** favourites **
    buildFavouritesList() { 
        this.list.favourites= this.list.applications.slice(1); 
        let i= this.app.config.selections.pluginFavourites.indexOf(this.app.config.plugins.instruments);
        if(i!=-1) { this.app.config.selections.pluginFavourites.splice(i,1) }
    }

    applySettings() {
        this.app.debug('Saving Settings..');
        if(!this.app.config.vesselTrail) {
            this.app.config.selections.trailFromServer= false;
        }
        this.app.saveConfig();    
    }
    
}