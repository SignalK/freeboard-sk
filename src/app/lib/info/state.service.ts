/* ******************************
* Application Platform Service **
* ******************************/
import {Injectable} from '@angular/core';

import {LocalStorage} from './localstorage.service';

@Injectable({
    providedIn: 'root'
})
export class State {	

    private _appid: string;
    private ls: LocalStorage; 

    constructor() { this.ls= new LocalStorage() }

    get appId() { return this._appid }

    set appId(value: string) {
        if(value && value.length!=0) {
            this._appid= value;
            this.ls.namespace = this._appid;
        }
    }

    /** load info, config & data **
     * returns {info: xx, config: xx, data: xx }  **/
    load() {
        return {
            info: this.loadInfo(),
            config: this.loadConfig(),
            data: this.loadData()
        }
    }    

    /** save info, config & data **
     * values= {info: xx, config: xx, data: xx }  **/
    save(values=null) {
        if(!values) { return }
        if(values.info) { this.saveInfo(values.info) }
        if(values.config) { this.saveConfig(values.config) }
        if(values.data) { this.saveData(values.data) }
    }    

    //** load app config **
    loadConfig(defaultValue={}) {
        let config = this.ls.read("config");
		return (config) ? config : defaultValue;
    }

    //** load app data **
    loadData(defaultValue={}) {
        let data = this.ls.read("data");
		return (data) ? data : defaultValue;
    }

    //** load app info **
    loadInfo(defaultValue= {}) {
        let info = this.ls.read("info");
		return (info) ? info : defaultValue;
    }

    //** persist app config **
    saveConfig(value=null) {
        if(value) { this.ls.write("config", value) }
    }

    //** persist app data **
    saveData(value=null) {
        if(value) { this.ls.write("data", value) }
    }

    //** persist app info **
    saveInfo(value=null) {
        if(value) { this.ls.write("info", value) }        
    }
	
}
