/*******************************
** Application Platform Service **
//*******************************/
import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class Platform {

	public name: any= '';
	public os: any= '';
	public webkit: boolean= false;
	public ie: boolean= false;
	public mozilla: boolean= false;
	public version: any= '';
    public mobile: boolean= false; 
    public app= {
        chromeOS: false,         // ** true if Chrome Packaged App on ChromeOS
        isInstalled: null,          // chrome.app.isInstalled
        runningState: null          // chrome.app.runningState()
    };
	
    constructor() { this.checkPlatform() }
	
    //** get platform details and return platform object **
    checkPlatform() {
        if(!navigator) { return; }
        let x= navigator.userAgent.indexOf("(");
        let y= navigator.userAgent.indexOf(")");
        let uagent= navigator.userAgent.substring(x+1, y).toLowerCase();

        this.os= uagent;
		this.webkit= ( /webkit/.test( navigator.appVersion.toLowerCase() ) ) ? true : false;
		this.ie= ( /msie/.test( navigator.appVersion.toLowerCase() ) ) ? true : false;
        this.ie= ( /rv:11/.test( navigator.appVersion.toLowerCase() ) ) ? true : this.ie;
		this.version= navigator.appVersion;
		this.name= navigator.platform;

        // ** check IOS version **
        if ( /iP(hone|od|ad)/.test( this.version ) ) {
            // console.warn("IOS detected");
            let v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
            let ver= [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || '0', 10)];
            this.os= `I${v[0]}`;
            this.version= `${ver[0]}.${ver[1]}.${ver[2]}`;		
            this.mobile= true;  		  
        }
        if (/(android)/.test(uagent) ) {
            // console.warn("Android detected");
            let v= (navigator.appVersion).match(/Android (\d+).(\d+).?(\d+)?/);
            let ver= [parseInt(v[1] || '0', 10), parseInt(v[2] || '0', 10), parseInt(v[3] || '0', 10)];
            this.os= v[0]  || '';
            this.version= `${ver[0]}.${ver[1]}.${ver[2]}`;     
            this.mobile= true;    
        }
        if (/(bb10|playbook|rim)/.test(uagent) ) {
            // console.warn("BlackBerry detected");
            let v= (navigator.appVersion).match(/Version\/(\d+).(\d+).?(\d+)?/);
            let ver= [parseInt(v[1] || '0', 10), parseInt(v[2] ||'0', 10), parseInt(v[3] || '0', 10)];
            this.os= `BlackBerry ${v[0]}`  || "";
            this.version= `${ver[0]}.${ver[1]}.${ver[2]}`;    
            this.mobile= true;     
        }
        if (/(windows phone)/.test(uagent) ) {
            // console.warn("Windows Phone detected");
            let v= (navigator.appVersion).match(/Windows Phone (\d+).(\d+).?(\d+)? /);
            let ver= [parseInt(v[1] || '0', 10), parseInt(v[2] || '0', 10), parseInt(v[3] || '0', 10)];
            this.os= v[0] || "";
            this.version= `${ver[0]}.${ver[1]}.${ver[2]}`;
            this.mobile= true;  
        }
    }
	
}
