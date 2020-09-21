/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { AppInfo } from 'src/app/app.info';
import { SignalKClient } from 'signalk-client-angular';
import { SKResources, SKRoute, SKWaypoint, SKRegion, SKTrack } from '../skresources/';
import { GeoUtils } from 'src/app/lib/geoutils';

@Injectable({ providedIn: 'root' })
export class GeoJSONLoadFacade  {

   // **************** ATTRIBUTES ***************************
    private errorCount:number=0;
    private subCount:number=0;

    private uploadSource: Subject<number>;
    public uploaded$: Observable<any>;

   // *******************************************************    

    constructor(private app: AppInfo, 
                private skres: SKResources,
                public signalk: SignalKClient) { 
        this.uploadSource= new Subject<number>();
        this.uploaded$= this.uploadSource.asObservable();                     
    }


    // ** parse GeoJSON file
    validate(fileData:any) {  
        try {
            let data= JSON.parse(fileData);
            if(typeof data.type==='undefined' || data.type!=='FeatureCollection') {
                return null;
            }
            if(typeof data.features==='undefined' || !Array.isArray(data.features) ) {
                return null;
            }
            // ** check each feature schema
            data.features.forEach( (f:any)=> {
                if(f.type && f.type==='Feature' && f.geometry && f.geometry.type) {
                    if(!f.properties) { f.properties= {} }
                }
            });
            return data;   
        }
        catch(err) { return null };             
    }    
    
    // ** upload selected features to Signal K server **
    uploadToServer(data:any) {
        this.errorCount=0;
        this.subCount=0;
        
        data.features.forEach( (f:any)=> {
            if(f.type && f.type==='Feature' && f.geometry && f.geometry.type) {
                switch(f.geometry.type) {
                    case 'LineString':  // route
                        this.transformRoute(f);                                    
                        break;
                    case 'Point':  // waypoint
                        this.transformWaypoint(f);                                                                    
                        break;
                    case 'MultiLineString':  // track
                        this.transformTrack(f);                                    
                        break;
                    case 'Polygon':  // region
                    case 'MultiPolygon':
                        this.transformRegion(f);                                  
                        break;                                                                  
                }
            }
            else { console.warn('Parse GeoJSON: invalid feature data!') }
        });
    }

    // ** check all submissions are resolved and emit upload$
    checkComplete() {
        if(this.subCount==0) {
            this.uploadSource.next(this.errorCount);
            this.app.debug(`GeoJSONLoad: complete: ${this.errorCount}`);
        }
    }

    // ** transform and upload route
    transformRoute(f: any) {
        let r= new SKRoute({feature: f});
        if(!f.properties) { f.properties= {} }
        r.name= (typeof f.properties.name!== 'undefined') ?
            f.properties.name : `rte-${new Date().getTime()}`;
        r.description= (typeof f.properties.description!== 'undefined') ?
            f.properties.description : 'GeoJSON import';
        if(typeof r.distance==='undefined') { r.distance= 0 }
        for(let i=0;i<f.geometry.coordinates.length-1;++i) { 
            r.distance+= GeoUtils.distanceTo(f.geometry.coordinates[i], f.geometry.coordinates[i+1]);
        }                                        
        this.subCount++;
        this.signalk.api.post(`/resources/routes`, r).subscribe( 
            r=> { 
                this.subCount--;
                if(r['state']=='COMPLETED') { 
                    this.app.debug('SUCCESS: GeoJSON Route added.');                       
                }
                else { this.errorCount++ }
                this.checkComplete();
            },
            err=> { this.errorCount++; this.subCount--; this.checkComplete() }
        );       
    } 
    
    // ** transform and upload waypoint
    transformWaypoint(f: any) {
        if(!f.properties) { f.properties= {} }
        f.properties.name= (typeof f.properties.name!== 'undefined') ?
            f.properties.name : `wpt-${new Date().getTime()}`;
        f.properties.description= (typeof f.properties.description!== 'undefined') ?
            f.properties.description : 'GeoJSON import';
                                    
        let r= new SKWaypoint({feature: f});
        if(f.geometry.coordinates && Array.isArray(f.geometry.coordinates)) {
            r.position= {latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0]};
        }                                     
        this.subCount++;
        this.signalk.api.post(`/resources/waypoints`, r).subscribe( 
            r=> { 
                this.subCount--;
                if(r['state']=='COMPLETED') { 
                    this.app.debug('SUCCESS: GeoJSON Waypoint added.');                       
                }
                else { this.errorCount++ }
                this.checkComplete();
            },
            err=> { this.errorCount++; this.subCount--; this.checkComplete() }
        );       
    } 

    // ** transform and upload track
    transformTrack(f: any) {
        if(!f.properties) { f.properties= {} }
        f.properties.name= (typeof f.properties.name!== 'undefined') ?
            f.properties.name : `trk-${new Date().getTime()}`;
        f.properties.description= (typeof f.properties.description!== 'undefined') ?
            f.properties.description : 'GeoJSON import';
        
        let r= new SKTrack({feature: f});
        this.subCount++;
        this.signalk.api.post(`/resources/tracks`, r).subscribe( 
            r=> { 
                this.subCount--;
                if(r['state']=='COMPLETED') { 
                    this.app.debug('SUCCESS: GeoJSON Track added.');                       
                }
                else { this.errorCount++ }
                this.checkComplete();
            },
            err=> { this.errorCount++; this.subCount--; this.checkComplete() }
        ); 
    } 
    
    // ** transform and upload region
    transformRegion(f: any) {
        if(!f.properties) { f.properties= {} }
        f.properties.name= (typeof f.properties.name!== 'undefined') ?
            f.properties.name : `rgn-${new Date().getTime()}`;
        f.properties.description= (typeof f.properties.description!== 'undefined') ?
            f.properties.description : 'GeoJSON import';
        let r= new SKRegion({feature: f});                                                                        
        this.subCount++;
        this.signalk.api.post(`/resources/regions`, r).subscribe( 
            r=> { 
                this.subCount--;
                if(r['state']=='COMPLETED') { 
                    this.app.debug('SUCCESS: GeoJSON Region added.');                       
                }
                else { this.errorCount++ }
                this.checkComplete();
            },
            err=> { this.errorCount++; this.subCount--; this.checkComplete() }
        );  
    }

}