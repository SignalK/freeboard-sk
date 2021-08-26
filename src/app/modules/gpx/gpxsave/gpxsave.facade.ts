/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SK2GPX } from './sk2gpx'

@Injectable({ providedIn: 'root' })
export class GPXSaveFacade  {

   // **************** ATTRIBUTES ***************************
    private resultSource: Subject<number>;
    public result$: Observable<any>;   
    private sk2gpx: SK2GPX;
    public hasFSA: boolean;

   // *******************************************************    

    constructor() { 
        this.resultSource= new Subject<number>();
        this.result$= this.resultSource.asObservable();      
        this.hasFSA= ("showOpenFilePicker" in window);             
    }

    // ** delete GPX object data **
    clear() { this.sk2gpx= null }

    // ** prepare resource data
    prepData(data:{[key:string]:any}) {  
        let resData= {
            routes: [],
            waypoints: []
        }    

        let idx:number= 1;
        resData.routes= data.routes.map( (r:any[])=> {
            let rte= r[1];
            rte.feature.id= r[0];
            return rte; 
        });
        idx=1;
        resData.waypoints= data.waypoints.map( (w:any[])=> {
            let wpt= w[1];
            wpt.feature.id= w[0];
            wpt.feature.properties.name= wpt.feature.properties.name ?? `Wpt: ${idx}`;
            idx++;
            return wpt;
        });                 
        return resData;       
    }    
    
    // ** save selected resources to GPX file **
    saveToFile(res:any, selections:any) {
        this.sk2gpx= new SK2GPX();

        let skroutes:{[key:string]:any} = {};
        let skwaypoints:{[key:string]:any} = {};

        for(let i=0; i<selections.rte.selected.length; i++) {
            if(selections.rte.selected[i]) { 
                skroutes[res.routes[i].feature.id]= res.routes[i];
            }
        }
        this.sk2gpx.setRoutes(skroutes);

        for(let i=0; i<selections.wpt.selected.length; i++) {
            if(selections.wpt.selected[i]) { 
                skwaypoints[res.waypoints[i].feature.id]= res.waypoints[i];
            }
        }
        this.sk2gpx.setWaypoints(skwaypoints);

        if(this.hasFSA) { this.fsaSaveFile() }
        else { this.legacySaveToFile() }
    }

    // Using legacy download
    legacySaveToFile() {
        let file = new Blob([this.sk2gpx.toXML()], {type: 'text/xml'});

        let a = document.createElement('a');
        a.href= URL.createObjectURL(file);
        a.download = 'fb_export.gpx';
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        this.resultSource.next(-1); //mimic cancelled as no result available
    }

    // Using fileSystem Access API (https)
    fsaSaveFile() {
        (window as any).showSaveFilePicker({
            types: [{
              description: 'GPX file',
              accept: {'text/xml': ['.gpx']},
            }],
          })
        .then( (h:any)=> { 
            h.createWritable()
            .then( (writable:any)=> {
                let blob = new Blob([this.sk2gpx.toXML()]);
                writable.write(blob).then( ()=>{ 
                    writable.close();
                    this.resultSource.next(0); // ** success
                });
            })
            .catch( (err:Error)=> {  // ** save error
                console.warn(err);
                this.resultSource.next(1);
            });
        })
        .catch( ()=> {  // save cancelled by user
            this.resultSource.next(-1);
        } );
    }

}