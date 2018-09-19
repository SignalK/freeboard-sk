import {Component, OnInit} from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SignalKClient } from 'signalk-client-angular';
import {AppInfo} from '../../app.info';


//** HomePage **
@Component({
    selector:	    'settings-dialog',
    templateUrl: 	'./settings-dialog.html',
    styleUrls: 	    ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {

    distanceUnits= [ 
        ['m', 'metres / Kilometres'], ['ft', 'feet / Nautical Miles']
    ];

    headingValue= [ 
        ['navigation.headingTrue', 'Heading True'], ['navigation.headingMagnetic', 'Heading Magnetic']
    ];

    smoothing= [ [5000,'5 secs'],[10000,'10 secs'],[20000,'20 secs'],[30000,'30 secs'] ];

    appList= [];

     
    constructor( 
        public dialogRef: MatDialogRef<SettingsDialog>, 
        public app: AppInfo,
        private signalk: SignalKClient ) { 
            if(app.config.plugins.instruments) { 
                this.appList.push(app.config.plugins.instruments);
            }
        }
    
    ngOnInit() { 
        this.signalk.get('/webapps').subscribe( (a: Array<any>)=> {
            this.appList= a.map( i=> { 
                if(!i._location) { // npm linked app
                    return {
                        name:  i.name,
                        description: i.description, 
                        url: `/${i.name}`
                    }                    
                }
                let x= i._location.indexOf('/signalk-server/');
                return {
                    name: i.name,
                    description: i.description, 
                    url: (x==-1) ? i._location : i._location.slice(15)
                }
            });
            this.appList.unshift({
                name:  'None',
                description: '', 
                url: null
            })
        })
    }

    ngOnDestroy() { }

    onFormChange(e, f) {
        if(!f.invalid) { 
            this.app.debug('Config Saved..');
            this.app.saveConfig() 
        } 
        else {
            this.app.debug('Form field error: Config NOT Saved!', "warn");
        }
    }

}
