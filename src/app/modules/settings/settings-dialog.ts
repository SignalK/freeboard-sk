import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { SettingsFacade } from './settings.facade';


//** HomePage **
@Component({
    selector:	    'settings-dialog',
    templateUrl: 	'./settings-dialog.html',
    styleUrls: 	    ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {

    public display= { paths: false }
     
    constructor( 
        public facade: SettingsFacade,
        public dialogRef: MatDialogRef<SettingsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }
    
    ngOnInit() { 
        this.facade.refresh();
        this.display.paths= this.data.openPrefs;
    }

    ngOnDestroy() { }

    onFormChange(e:any, f:any) {
        if(!f.invalid) { this.facade.applySettings() } 
        else { console.warn('SETTINGS:','Form field invalid: Config NOT Saved!') }
    }

    onPreferredPaths(e:any) { 
        this.display.paths= false;
        if(e.save) { 
            this.facade.settings.selections.preferredPaths= e.value;
            this.facade.applySettings();
        }
    }

}
