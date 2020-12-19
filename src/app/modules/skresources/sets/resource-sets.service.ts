import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { SignalKClient } from 'signalk-client-angular';
import { AppInfo } from 'src/app/app.info';
import { SKResourceSet } from './resource-set';


// ** Signal K custom / other resource(s) operations
@Injectable({ providedIn: 'root' })
export class SKOtherResources {

    constructor( public dialog: MatDialog,
        public signalk: SignalKClient, 
        public app: AppInfo) { }


    // **** ITEMS ****

    /** get items(s) from sk server
     * selected: true= only include selected items
     * noUpdate: true= suppress updateSource event
    */
    getItems(resType: string, selected:boolean=false) {
        let path= `/resources/${resType}`;
        this.signalk.api.get(path).subscribe( 
            res=> { 
                this.app.data.resourceSets[resType]= [];
                let items= this.processItems(res);
                if(selected) {
                    if(!this.app.config.selections.resourceSets[resType]) {
                        this.app.config.selections.resourceSets[resType]= [];
                    }
                    this.app.data.resourceSets[resType]= items.filter( i=> {
                        return (this.app.config.selections.resourceSets[resType].includes(i.id) ) ?
                            true : false;
                    });
                }
                else { this.app.data.resourceSets[resType]= items }

                // ** clean up selections
                if(this.app.config.selections.resourceSets[resType]) {
                    let k= Object.keys(res);
                    this.app.config.selections.resourceSets[resType]= this.app.config.selections.resourceSets[resType].map( i=> {
                        return k.indexOf(i)!=-1 ? i : null;
                    }).filter(i=> { return i});    
                }
            }
        );
    }

    // ** process data and apply styles
    processItems(res:any) {
        let items= [];
        Object.entries(res).forEach( (r:any)=> {
            if(!r[1].type || (r[1].type && r[1].type!='ResourceSet') ) { return } //invalid
            let t: SKResourceSet= new SKResourceSet(r[1]);
            t.id= r[0].toString();
            // apply default / styleRefs to features
            t.values.features.forEach(f=> {
                if(f.properties.styleRef) { //styleRef
                    if(t.styles && t.styles[f.properties.styleRef]) {
                        f.properties.style= t.styles[f.properties.styleRef];
                    }
                    else if(t.styles['default']) {
                        f.properties.style= t.styles['default'];
                    }
                }
                else if(!f.properties.style) { // no style (use default)
                    if(t.styles && t.styles['default']) {
                        f.properties.style= t.styles['default'];
                    }
                }
                // fall through= use defined style
                // enforce min style
                if(!f.properties.style.lineDash) { f.properties.style.lineDash= [1] }
                if(!f.properties.style.width) { 
                    f.properties.style.width= (f.geometry.type=='Point') ? 4 : 2;
                }
            });
            items.push(t);
        });
        return items;
    }

}
