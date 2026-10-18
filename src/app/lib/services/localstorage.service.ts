/***********************************
LocalStorage Service
************************************
Class to encapsulate window.localStorage
	namespace: prefixes keys with value supplied 
***********************************/

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorage {
  private _ls: Storage = null;
  private _namespace = '';

  constructor() {
    this._ls = null;
    try {
      if ('localStorage' in window && window['localStorage'] !== null) {
        this._ls = window.localStorage;
      }
    } catch {
      console.warn('window.localStorage is not supported by this browser!');
    }
  }

  set namespace(value) {
    this._namespace = value + '_';
  }
  get namespace() {
    return this._namespace;
  }

  //** read data and return a JSON object to supplied key
  read(key: string) {
    if (this._ls && key) {
      try {
        return JSON.parse(this._ls.getItem(this._namespace + key));
      } catch {
        return this._ls.getItem(this._namespace + key);
      }
    }
  }

  //** write data as a JSON object to supplied key
  write(key: string, value: unknown = '') {
    const json = JSON.stringify(value);
    if (this._ls && key) {
      this._ls.setItem(this._namespace + key, json);
    }
  }

  //** delete the supplied key
  delete(key: string) {
    if (this._ls && key) {
      return this._ls.removeItem(this._namespace + key);
    }
  }

  //** check supplied key exists **
  exists(key: string) {
    if (this._ls && key) {
      return this._ls.getItem(this._namespace + key) ? true : false;
    }
  }
}
