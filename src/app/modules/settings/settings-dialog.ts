import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { SettingsFacade } from './settings.facade';


//** HomePage **
@Component({
    selector:	    'settings-dialog',
    templateUrl: 	'./settings-dialog.html',
    styleUrls: 	    ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {
     
    constructor( 
        public facade: SettingsFacade,
        public dialogRef: MatDialogRef<SettingsDialog>) { }
    
    ngOnInit() { this.facade.refresh() }

    ngOnDestroy() { }

    onFormChange(e, f) {
        if(!f.invalid) { this.facade.applySettings() } 
        else { console.warn('SETTINGS:','Form field invalid: Config NOT Saved!') }
    }

}
