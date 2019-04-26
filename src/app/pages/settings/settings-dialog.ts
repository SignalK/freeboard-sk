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
        ['m', 'Kilometres'], ['ft', 'Nautical Miles']
    ];

    depthUnits= [ 
        ['m', 'metres'], ['ft', 'feet']
    ];    

    headingValue= [['navigation.headingTrue', 'True']];

    aisWindVector= [ 
        [false, 'Wind True'], [true, 'Wind Apparent']
    ];   
    
    minZoomList= [8,9,10,11,12,13,15,16,17];

    resRadiusList= [ [5000, '5 km'],[10000, '10 km'],[15000, '15 km'],[20000,'20 km'],[50000, '50 km'] ];

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
        let appListUrl= null;
        let nodeUri= '/webapps';
        let javaUri= `/signalk/v${this.signalk.version}/apps/list`;

        this.app.data.headingValues.forEach( i=>{
            if(i=='navigation.headingMagnetic') {
                this.headingValue.push(['navigation.headingMagnetic', 'Magnetic'] );
            }
        });

        if(this.app.data.server && this.app.data.server.id ) {
            appListUrl= (this.app.data.server.id=='signalk-server-node') ? nodeUri : javaUri;
            this.signalk.get(appListUrl).subscribe( 
                (a: Array<any>)=> {
                    this.appList= a.map( i=> { 
                        if(i.name=='@signalk/freeboard-sk') { return null }
                        if(!i._location) { // npm linked app
                            return {
                                name: i.name,
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
                    }).filter(e=> {return e} );
                    this.appList.unshift({
                        name:  'None',
                        description: '', 
                        url: null
                    });
                },
                err=> { this.app.debug('ERROR retrieving AppList!') }
            );
        }
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
