//*************************************
//** Application Information Service **
//*************************************
import { Injectable, isDevMode } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { State } from './state.service';

@Injectable()
export class Info {
    public id: string ='appId';
    public name: string= 'appName';
    public shortName: string= 'appShortName';
    public description: string= `appDescription`;
    public version: string= '17.12.05';
    public released: string= '17/12/2017';
    public url: string= 'http://panazzolo.com';
    public bitlyUrl: string= 'http://bit.ly/HbOf0b';
    public logo: string= './assets/img/app_logo.png';

    protected devMode: boolean;
    
    public config: any;     //** holds app configuration settings **
    public data: any;       //** holds app data **
    public state: State;  

    // Observables
    private upgradedSource: Subject<any>;
    public upgraded$: Observable<any>;
    private settings: Subject<any>;
    public settings$: Observable<any>; 


    constructor() {
        this.state= new State();  
        this.devMode= isDevMode();
        //** default configuration and data **
        this.config= {};
        this.data= {};
        this.state.appId= this.id;
        // ** initialise events
        this.upgradedSource= new Subject<any>();
        this.upgraded$= this.upgradedSource.asObservable();
        this.settings= new Subject<any>();
        this.settings$ = this.settings.asObservable();         
    }

    // ** initialise.. set state.appId **
    init(appId= this.id) {
        this.state.appId= appId;
    }

    //** write debug information to console in devMode only **
    debug(...e:any) {
        e.unshift('debug:');
        if(this.devMode) {
            console.info(...e); 
        }
    }

    /** Check versions to detect application update 
     * emits:  observable event app.upgraded$
     * returns: {result: [null || new || update], previous: [null || prev version], new: info.version} **/
    checkVersion() {
        let cv=this.loadInfo();
        let value= {result: null, previous: cv.version || null, new: this.version};
        if(cv.version) {    // ** check for newer version **
            if( this.version.indexOf(cv.version)==-1) {
                value.result='update';
                this.debug(`AppInfo: Version update detected.. (${cv.version} -> ${this.version})`, 'info');
                this.upgradedSource.next(value);
            }
        }
        else { // **  new install **
            value.result='new';
            this.saveInfo();
            this.debug(`AppInfo: New Install detected.. (${this.version})`, 'info');
            this.upgradedSource.next(value);
        }
        return value;
    }

    //** load app version Info **
    loadInfo() { return this.state.loadInfo() }    

    //** persist version info **
    saveInfo() {
        this.state.saveInfo({
            name: this.shortName,
            version: this.version
        });
    }
    
    //** load app config **
    loadConfig() { 
        this.config= this.state.loadConfig(this.config);
        this.settings.next({action: 'load', setting: 'config'});
    }

    //** load app data **
    loadData() { 
        this.data= this.state.loadData(this.data); 
        this.settings.next({action: 'load', setting: 'data'});
    }

    //** persist app config **
    saveConfig(suppressEvent?: boolean) { 
        this.state.saveConfig(this.config); 
        if(!suppressEvent) {
            this.settings.next({action: 'save', setting: 'config'});
        }
        
    }

    //** persist app data **
    saveData(suppressEvent?: boolean) { 
        this.state.saveData(this.data);
        if(!suppressEvent) {
            this.settings.next({action: 'save', setting: 'data'});
        }
    }    
}