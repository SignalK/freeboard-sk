import { Component, OnInit, Inject, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { SettingsFacade } from './settings.facade';


//** HomePage **
@Component({
    selector:	    'settings-dialog',
    templateUrl: 	'./settings-dialog.html',
    styleUrls: 	    ['./settings-dialog.css']
})
export class SettingsDialog implements OnInit {

    public display= { paths: false, favourites: false }
    public menuItems= [
       {id: 'sectDisplay', text: 'Display'},
       {id: 'sectUnits', text: 'Units & Values'},
       {id: 'sectVessels', text: 'Vessels'},
       {id: 'sectNotes', text: 'Notes'},
       {id: 'sectVideo', text: 'Video'},
       {id: 'sectResLayers', text: 'Resources'},
       {id: 'sectResLayers', text: 'Signal K'}
    ];

    private saveOnClose: boolean= false;
     
    constructor( 
        public facade: SettingsFacade,
        public myElement: ElementRef,
        public dialogRef: MatDialogRef<SettingsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }
    
    ngOnInit() { 
        this.facade.refresh();
        this.display.paths= this.data.openPrefs;
    }

    ngOnDestroy() { }

    jumpTo(id:string, wait: boolean= false) {
        if(wait) {
            setTimeout( 
                ()=> this.jumpTo(id, false),
                50
            );
        }
        else {
            this.myElement.nativeElement.ownerDocument.getElementById(id).scrollIntoView({behavior: 'smooth'});
        }
    }

    // ** handle dialog close action
    handleClose() { this.dialogRef.close(this.saveOnClose) }

    toggleFavourites() { this.display.favourites= (this.display.favourites) ? false : true }

    onFormChange(e:any, f:any, deferSave:boolean= false) {
        if(deferSave) { this.saveOnClose= true }
        else {
            if(!f.invalid) { this.facade.applySettings() } 
            else { console.warn('SETTINGS:','Form field invalid: Config NOT Saved!') }
        }
    }

    onPreferredPaths(e:any) { 
        this.display.paths= false;
        if(e.save) { 
            this.facade.settings.selections.preferredPaths= e.value;
            this.facade.applySettings();
        }
    }

    onFavSelected(e:any, f:any) {
        this.facade.settings.selections.pluginFavourites= f.selectedOptions.selected.map(i=> i.value );
        this.facade.applySettings();
    }

    onResPathSelected(e:any, f:any) {
        this.facade.settings.resources.paths= f.selectedOptions.selected.map(i=> i.value );
        //ensure all selected paths have relevant 'selections' entry
        this.facade.settings.resources.paths.forEach( i=> {
            if( i in this.facade.settings.selections.resourceSets) { /* already has selection array */ }
            else { this.facade.settings.selections.resourceSets[i]= [] } //create selection array
        })
        this.facade.applySettings();
    }

}
