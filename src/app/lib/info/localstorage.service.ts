/***********************************
LocalStorage Service
************************************
Class to encapsulate window.localStorage
	namespace: prefixes keys with value supplied 
***********************************/

import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LocalStorage {
	private _ls =null;
	private _namespace: string="";
	
	constructor()  {
		this._ls= null;
		try {
			if('localStorage' in window && window['localStorage'] !== null) {
				this._ls = window.localStorage;
			}
		} catch (e) {
			console.warn("window.localStorage is not supported by this browser!");
		}
	}
	
	set namespace(value) {
		this._namespace= value + "_";
	}
	get namespace() {
		return this._namespace;
	}
	
	//** read data and return a JSON object to supplied key
	read(key) {
		if(this._ls && key) {
			try {
				return JSON.parse( this._ls.getItem(this._namespace + key) );
			}
			catch(e) {
				return this._ls.getItem(this._namespace + key);
			}
		}
	}
	
	//** write data as a JSON object to supplied key
	write(key, value:any="") {
		value= JSON.stringify(value);
		if(this._ls && key) {
			this._ls.setItem(this._namespace + key, value);
		}
	}	
	
	//** delete the supplied key
	delete(key) {	
		if(this._ls && key) {
			return this._ls.removeItem(this._namespace + key);
		}
	}
	
	//** check supplied key exists **
	exists(key) { 	
		if(this._ls && key) {
			return (this._ls.getItem(this._namespace + key) ) ? true : false;
		}
	}	
	
}

