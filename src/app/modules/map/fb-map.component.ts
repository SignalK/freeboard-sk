import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material';

import { proj, coordinate, style, Collection } from 'openlayers';
import { Convert } from '../../lib/convert';
import { GeoUtils } from '../../lib/geoutils';

import { AppInfo } from '../../app.info'
import { SKResources } from '../skresources/resources.service';
import { SKVessel } from '../skresources/resource-classes';
import { SKStreamFacade } from '../skstream/skstream.facade';

interface IResource {
    id: string;
    type: string;
}

const MAP_SRID:string= 'EPSG:4326';
const MAP_MAX_ZOOM:number= 28;
const MAP_MIN_ZOOM:number= 1;

enum INTERACTION_MODE {
    MEASURE,
    DRAW,
    MODIFY
}

@Component({
    selector: 'fb-map',
    templateUrl: './fb-map.component.html',
    styleUrls: ['./fb-map.component.css']
})
export class FBMapComponent implements OnInit, OnDestroy {
    @Input() setFocus: boolean;
    @Input() mapCenter: [number,number]= [0,0];
    @Input() mapZoom: number= 1;
    @Input() movingMap: boolean= false;
    @Input() northUp: boolean= true;
    @Input() measureMode: boolean= false;
    @Input() drawMode: string= null;
    @Input() modifyMode: boolean= false;
    @Input() activeRoute: string;
    @Output() measureStart: EventEmitter<boolean>= new EventEmitter();
    @Output() measureEnd: EventEmitter<boolean>= new EventEmitter();
    @Output() drawEnd: EventEmitter<any>= new EventEmitter();
    @Output() modifyStart: EventEmitter<any>= new EventEmitter();
    @Output() modifyEnd: EventEmitter<Array<[number,number]>>= new EventEmitter();
    @Output() activate: EventEmitter<string>= new EventEmitter();
    @Output() deactivate: EventEmitter<string>= new EventEmitter();
    @Output() info: EventEmitter<IResource>= new EventEmitter();
    @Output() exitedMovingMap: EventEmitter<boolean>= new EventEmitter();
    @Output() focusVessel: EventEmitter<string>= new EventEmitter();
    
    @ViewChild('aolMap', {static: true}) aolMap; 
    @ViewChild(MatMenuTrigger, {static: true}) contextMenu: MatMenuTrigger;

    // ** draw interaction data 
    public draw= {
        enabled: false,
        mode: null,
        type: 'Point',
        coordinates: null,
        modify: false,
        features: null,
        forSave: null,
        properties: {}
    }

    // ** measure interaction data 
    public measure= {
        enabled: false,
        end: false,
        geom: null,
        style: new style.Style({
            stroke: new style.Stroke({
                color: 'purple', 
                lineDash: [10,10],
                width: 2
            })
        }),
        totalDistance: 0,
        coords: []
    } 
       
    public vesselLines= {
        twd: [null,null],
        awa: [null,null],
        bearing: [null,null],
        heading: [null,null],
        anchor: []
    }

    public overlay= {
        id: null,
        type: null,
        position: [0,0],
        show: false,
        title: '',
        content: null,
        featureCount: 0
    }   

    private zoomOffsetLevel=[
        1,1000000,550000,290000,140000,70000,
        38000,17000,7600,3900,1900,
        950,470,250,120,60,
        30,15.5,8.1,4,2,
        1,.5,.25,.12,.06,
        .03,.015,.008,1
    ] 

    // ** map ctrl **
    fbMap= {
        srid: MAP_SRID,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        rotation: 0,
        center: [0, 0],
        zoomLevel: 1,
        movingMap: false,
        northUp: true
    }

    // ** map feature data
    dfeat= {
        routes: [],
        waypoints: [],
        charts: [],
        notes: [],
        regions: [],
        self: new SKVessel(),   //self vessel
        ais: new Map(),         // other vessels
        active: new SKVessel(),  // focussed vessel
        navData: {position: null},
        closest: {id: null, position: [0,0]}
    }

    // AIS target management
    aisMgr= {
        updateList: [],
        staleList: [],
        removeList: []
    }

    private saveTimer: any;
    private isDirty: boolean=false;
    public coord= coordinate;

    private mouse= {
        pixel: null,
        coords: null,
        xy: null
    }
    contextMenuPosition = { x: '0px', y: '0px' };    

    private obsList= [];
    
    constructor(
            public app: AppInfo, 
            public skres: SKResources, 
            private skstream: SKStreamFacade) { }

    ngAfterViewInit() { 
        setTimeout( ()=> this.aolMap.instance.updateSize(), 100 );
        this.aolMap.instance.a.tabIndex=0;
        this.aolMap.instance.a.focus();
    }              

    ngOnInit() { 
        // ** STREAM VESSELS update event
        this.obsList.push(this.skstream.vessels$().subscribe( ()=> this.onVessels() ));
        // ** RESOURCES update event
        this.obsList.push( this.skres.update$().subscribe( value=> this.onResourceUpdate(value) ) );     
        // ** SETTINGS **
        this.obsList.push(
            this.app.settings$.subscribe( r=> {               
                if(r.action=='save' && r.setting=='config') {  
                    this.fbMap.movingMap= this.app.config.map.moveMap;
                }
            })
        );     
    }

    ngOnDestroy() { 
        this.stopSaveTimer();
        this.obsList.forEach( i=> i.unsubscribe() );
    }

    ngOnChanges(changes) {
        if(changes.setFocus && changes.setFocus.currentValue==true) { 
            this.aolMap.instance.a.focus(); 
        }
        if(changes && changes.mapCenter) {
            this.fbMap.center= (changes.mapCenter.currentValue) ? changes.mapCenter.currentValue : this.fbMap.center;
        }    
        if(changes && changes.mapZoom) {
            this.fbMap.zoomLevel= (changes.mapZoom.currentValue) ? changes.mapZoom.currentValue : this.fbMap.zoomLevel;
        }   
        if(changes && changes.movingMap && !changes.movingMap.firstChange ) {
            this.fbMap.movingMap= changes.movingMap.currentValue;
            if(this.fbMap.movingMap) { this.startSaveTimer() }
            else { this.stopSaveTimer() }            
            this.centerVessel();
        }    
        if(changes && changes.northUp && !changes.northUp.firstChange ) {
            this.fbMap.northUp= changes.northUp.currentValue;
            this.rotateMap();
        }                
        if(changes && changes.measureMode && !changes.measureMode.firstChange ) {
            this.interactionMode(INTERACTION_MODE.MEASURE, changes.measureMode.currentValue);
        }   
        if(changes && changes.drawMode && !changes.drawMode.firstChange ) {
            this.interactionMode(INTERACTION_MODE.DRAW, changes.drawMode.currentValue);
        }                           
        if(changes && changes.modifyMode && !changes.modifyMode.firstChange ) {
            this.interactionMode(INTERACTION_MODE.MODIFY, changes.modifyMode.currentValue);
        }  
        if(changes && changes.measureMode) {
            if(changes.measureMode.currentValue) { this.overlay.type= 'measure' };
        }        
    }

    // ** periodically persist state (used in movingMap mode)
    private startSaveTimer() {
        if(!this.saveTimer) {
            this.saveTimer= setInterval( ()=> { 
                if(this.isDirty) { 
                    this.app.saveConfig(); 
                    this.isDirty=false; 
                }
            }, 30000 ); 
        }   
    }  

    private stopSaveTimer() { 
        if(this.saveTimer) { 
            clearInterval(this.saveTimer);
            this.saveTimer= null;
        } 
    }

    // ********** EVENT HANDLERS *****************  

    private onVessels() {
        this.dfeat.self= this.app.data.vessels.self;
        this.dfeat.ais= this.app.data.vessels.aisTargets;
        this.dfeat.active= this.app.data.vessels.active;
        this.dfeat.navData.position= this.app.data.navData.position;
        this.dfeat.closest= {
            id: this.app.data.vessels.closest.id,
            position: this.app.data.vessels.closest.position
        }
        this.aisMgr= this.app.data.aisMgr;

        // ** update vessel on map **
        if(this.dfeat.self['positionReceived']) { this.app.data.vessels.showSelf= true } 
        // ** locate vessel popover
        if(this.overlay.show && this.overlay['type']=='ais') {
            if(this.overlay['isSelf']) { 
                this.overlay.position= this.dfeat.self.position;
                this.overlay['vessel']= this.dfeat.self;
            }
            else { 
                this.overlay['vessel']= this.dfeat.ais.get(this.overlay['id']);
                this.overlay.position= this.overlay['vessel'].position;
            }
        }  
        this.drawVesselLines();
        this.rotateMap();  
        if(this.fbMap.movingMap) { this.centerVessel() }    
    }

    private onResourceUpdate(value:any) {
        this.app.debug('skres.update$ -> map.onResourceUpdate()');
        this.app.debug(value);
        if(value.action=='get') {
            if(value.mode=='route') { this.dfeat.routes= this.app.data.routes }
            if(value.mode=='waypoint') { this.dfeat.waypoints= this.app.data.waypoints }
            if(value.mode=='chart') { this.dfeat.charts= this.app.data.charts }
            if(value.mode=='note') { 
                this.dfeat.notes= this.app.data.notes;
                this.dfeat.regions= this.app.data.regions;
            }
        }
    }    

    // ********** MAP EVENT HANDLERS *****************    

    // ** handle context menu choices **
    public onContextMenuAction(action:string, e:any) {
        switch(action) {
            case 'add_wpt': 
                this.skres.showWaypointEditor({position: e});
                break;
            case 'add_note':
                this.skres.showNoteEditor({position: e});
                break;
            case 'nav_to':
                if(this.app.data.activeRoute) { 
                    this.skres.clearActiveRoute(this.app.data.vessels.activeId, true);
                }
                this.app.data.activeWaypoint= null;
                this.skres.setNextPoint({
                    latitude: e[1], 
                    longitude: e[0]
                });
                break; 
            case 'measure':
                this.measureStart.emit(true);
                break;
        }
    }

    // ** handle mouse right click - show context menu **
    public onMapRightClick(e:any) { 
        e.preventDefault(); 
        this.contextMenuPosition.x= e.clientX + 'px';
        this.contextMenuPosition.y= e.clientY + 'px';
        this.contextMenu.menuData= { 'item': this.mouse.coords };
        if(this.measureMode) { this.onMeasureClick(this.mouse.xy) }
        else if(!this.modifyMode) { 
            this.contextMenu.openMenu();   
            document.getElementsByClassName('cdk-overlay-backdrop')[0].addEventListener('contextmenu', (offEvent: any) => {
                offEvent.preventDefault();  // prevent default context menu for overlay
                this.contextMenu.closeMenu();
            }); 
        }
    }

    public onMapMove(e:any) {
        let v= e.map.getView();
        let z= Math.round(v.getZoom());
        this.app.config.map.zoomLevel=z;
        this.app.debug(`Zoom: ${z}`);

        if(!this.app.config.map.mrid) { this.app.config.map.mrid= v.getProjection().getCode() }
        let center = proj.transform(
            v.getCenter(), 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );
        this.app.config.map.center= center;

        this.drawVesselLines();
        if(!this.fbMap.movingMap) { 
            this.app.saveConfig()
            this.isDirty=false;
        }
        else { this.isDirty=true }

        // retrieve Notes
        if(this.fetchNotes()) {this.skres.getNotes();this.app.debug(`fetching Notes...`) }
    }

    public onMapPointerMove(e:any) {
        this.mouse.pixel= e.pixel;
        this.mouse.xy= e.coordinate;
        this.mouse.coords= proj.transform(
            e.coordinate, 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );
        if(this.measure.enabled && this.measure.coords.length!=0) {
            let c= proj.transform(
                e.coordinate, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            ); 
            this.overlay.position= c;  

            let l= this.measure.totalDistance + this.measureDistanceToAdd(c);
            this.overlay.title= (this.app.config.units.distance=='m') ? 
                `${(l/1000).toFixed(2)} km` :
                `${Convert.kmToNauticalMiles(l/1000).toFixed(2)} NM`;    
        }            
    }

    public onMapPointerDrag(e:any) { 
        this.fbMap.movingMap=false;
        this.exitedMovingMap.emit(true);
    }

    public onMapMouseClick(e:any) {
        if(this.measure.enabled) { this.onMeasureClick(e.coordinate) }  
        else if(!this.draw.enabled && !this.draw.modify) {
            let flist= new Map();
            let fa= [];
            // compile list of features at click location
            e.map.forEachFeatureAtPixel(e.pixel, (feature, layer)=> {
                let id= feature.getId();
                let addToFeatureList: boolean= false;
                let notForModify: boolean= false;
                if(id) {
                    let t= id.split('.');
                    let icon: string;
                    let text: string;
                    switch(t[0]) {
                        case 'note': icon="local_offer"; 
                            addToFeatureList= true;
                            text= this.app.data.notes.filter( i=>{ return (i[0]==t[1])? i[1].title : null })[0][1].title;
                            break;
                        case 'sptroute':    // route start / end points
                        case 'eptroute':
                            icon="directions"; 
                            t[0]='route';
                            id= t.join('.');
                            addToFeatureList= true;
                            notForModify= true;
                            text= this.app.data.routes.filter( i=>{ return (i[0]==t[1])? i[1].name : null })[0][1].name;
                            break;                            
                        case 'route': icon="directions"; 
                            addToFeatureList= true;
                            text= this.app.data.routes.filter( i=>{ return (i[0]==t[1])? i[1].name : null })[0][1].name;
                            break;
                        case 'waypoint': icon="location_on"; 
                            addToFeatureList= true;
                            text= this.app.data.waypoints.filter( i=>{ return (i[0]==t[1])? i[1].feature.properties.name : null })[0][1].feature.properties.name;
                            break;
                        case 'ais-vessels': icon="directions_boat"; 
                            addToFeatureList= true;
                            let v= this.dfeat.ais.get(`vessels.${t[1]}`);
                            text= (v) ? v.name || v.mmsi || v.title : '';
                            break;
                        case 'vessels': icon="directions_boat"; 
                            addToFeatureList= true;
                            text= this.dfeat.self.name + ' (self)' || 'self'; 
                            break;
                        case 'region': 
                            addToFeatureList= true;
                            icon="360"; text='Region'; break;
                    }
                    if(addToFeatureList && !flist.has(id)) {
                        flist.set(id, {
                            id: id, 
                            coord: e.coordinate, 
                            mrid: this.app.config.map.mrid,
                            icon: icon,
                            text: text
                        });
                        if(notForModify) { // get route feature when end points clicked
                            let f= layer.getSource().getFeatureById(id);
                            if(f) { fa.push(f) } 
                        }
                        else { fa.push(feature) }
                    }
                }  
            });
            this.draw.features= new Collection(fa); // features collection for modify interaction
            if(flist.size==1) {   // only 1 feature
                let v= flist.values().next().value;
                this.formatPopover( 
                    v['id'],
                    v['coord'],
                    v['mrid']
                );  
            }
            else if(flist.size>1) { //show list of features
                this.formatPopover( 
                    'list.',
                    e.coordinate,
                    this.app.config.map.mrid,
                    flist
                );                  
            }
        }
    }
    
    // ** Map Interaction events **
    public onMeasureStart(e:any) {
        this.measure.geom= e.feature.getGeometry();
        let c= proj.transform(
            this.measure.geom.getLastCoordinate(), 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );  
        this.formatPopover(null,null,null);          
        this.overlay.position= c;
        this.overlay.title= '0';
        this.overlay.show= true;  
    }

    public onMeasureClick(pt:[number,number]) {
        let c= proj.transform(
            pt,
            this.app.config.map.mrid, 
            this.app.config.map.srid
        ); 
        this.measure.coords.push(c);
        this.overlay.position= c;

        let l= this.measureDistanceToAdd();
        this.measure.totalDistance+= l;
        this.overlay.title= (this.app.config.units.distance=='m') 
            ? `${(this.measure.totalDistance/1000).toFixed(2)} km` 
            : `${Convert.kmToNauticalMiles(this.measure.totalDistance/1000).toFixed(2)} NM`;           
    }

    public onMeasureEnd(e?:any) {
        this.measure.geom= null;         
        this.overlay.show= false;
        this.measure.enabled= false;  
        this.measureEnd.emit(true);      
    }

    public onDrawEnd(e:any) {
        this.draw.enabled=false;
        let c:any;
        switch(this.draw.type) {
            case 'Point':
                this.draw.coordinates= proj.transform(
                    e.feature.getGeometry().getCoordinates(), 
                    this.app.config.map.mrid, 
                    this.app.config.map.srid
                );     
                break;
            case 'LineString':
                let rc= e.feature.getGeometry().getCoordinates();
                c= rc.map( i=> { 
                    return proj.transform(
                        i, 
                        this.app.config.map.mrid, 
                        this.app.config.map.srid
                    );
                });
                this.draw.coordinates= c;
                break;
            case 'Polygon':  // region + Note
                let p= e.feature.getGeometry().getCoordinates();
                if(p.length==0) { this.draw.coordinates= [] }
                c= p[0].map( i=> { 
                    return proj.transform(
                        i, 
                        this.app.config.map.mrid, 
                        this.app.config.map.srid
                    );
                });
                this.draw.coordinates= c;
                break;                
        }
        this.drawEnd.emit(this.draw);
    }   

    public onModifyStart(e:any) {
        if(!this.draw.forSave) { 
            this.draw.forSave= { id: null, coords: null};
            this.draw.forSave.id= e.features.getArray()[0].getId();
        }
    }

    public onModifyEnd(e:any) {
        let f= e.features.getArray()[0];
        let fid= f.getId();
        let c= f.getGeometry().getCoordinates();
        let pc:any;
        if(fid.split('.')[0]=='route') {
            pc= this.transformCoordsArray(c);
        }
        else if(fid.split('.')[0]=='region') {
            for(let e=0; e<c.length; e++) { 
                if(this.isCoordsArray(c[e])) { c[e]= this.transformCoordsArray(c[e]) }
                else { 
                    for(let p=0; p<c[e].length; p++) { 
                        if(this.isCoordsArray(c[e][p])) { c[e][p]= this.transformCoordsArray(c[e][p]) }
                        else {  console.log('Invalid polygon coordinates!') }                           
                    }
                }
            };
            pc= c;
        }        
        else {  // point feature
            pc= proj.transform(
                c, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            );
        }
        this.draw.forSave['coords']= pc;
        this.modifyEnd.emit(this.draw.forSave)
    } 

    // ****** MAP control functions *******

    // ** handle map zoom controls 
    public zoomMap(zoomIn:boolean) {
        if(zoomIn) {
            if(this.app.config.map.zoomLevel<MAP_MAX_ZOOM) { ++this.app.config.map.zoomLevel }
        }
        else { 
            if(this.app.config.map.zoomLevel>MAP_MIN_ZOOM) { --this.app.config.map.zoomLevel }
        }
    }

    // ** orient map heading up / north up **
    public rotateMap() {
        if(this.fbMap.northUp) { this.fbMap.rotation=0 }
        else { 
            this.fbMap.rotation= 0-this.dfeat.active.orientation; 
        }
    }

    // ** center map to active vessel position
    public centerVessel() { 
        let t=this.dfeat.active.position;
        t[0]+=0.0000000000001;
        this.fbMap.center= t;
    }  

    public drawVesselLines() {
        let z= this.app.config.map.zoomLevel;
        let offset= (z<29) ? this.zoomOffsetLevel[z] : 60;
        let wMax= 10;   // ** max line length

        // ** bearing line (active) **
        let bpos= (this.dfeat.navData.position && this.dfeat.navData.position[0]) ? 
            this.dfeat.navData.position : this.dfeat.active.position;
        this.vesselLines.bearing= [
            this.dfeat.active.position, 
            bpos
        ]; 

        // ** anchor line (active) **
        if(!this.app.config.anchor.raised) {
            this.vesselLines.anchor= [
                this.app.config.anchor.position,
                this.dfeat.active.position
            ];
        }                     

        // ** heading line (active) **
        let sog=(this.dfeat.active.sog || 0);
        if(sog>wMax) { sog=wMax }
        this.vesselLines.heading= [
            this.dfeat.active.position, 
            GeoUtils.destCoordinate(
                this.dfeat.active.position[1],
                this.dfeat.active.position[0],
                this.dfeat.active.orientation,
                sog * offset
            )
        ];

        // ** awa (focused) **
        let aws= (this.dfeat.active.wind.aws || 0);
        if(aws>wMax) { aws=wMax }

        let ca= (this.app.config.map.northup) ? 
            this.dfeat.active.wind.awa :
            this.dfeat.active.wind.awa + this.dfeat.active.orientation;

        this.vesselLines.awa= [
            this.dfeat.active.position, 
            GeoUtils.destCoordinate(
                this.dfeat.active.position[1],
                this.dfeat.active.position[0],
                ca,
                (this.dfeat.active.orientation) ? aws * offset : 0
            )
        ];        
        
        // ** twd (focused) **
        let tws= (this.dfeat.active.wind.tws || 0);
        if(tws>wMax) { tws=wMax }
        let wd= (this.app.useMagnetic) ? 
            this.dfeat.active.wind.mwd : 
            this.dfeat.active.wind.twd;
        this.vesselLines.twd= [
            this.dfeat.active.position, 
            GeoUtils.destCoordinate(
                this.dfeat.active.position[1],
                this.dfeat.active.position[0],
                wd || 0,
                (wd) ? tws * offset : 0
            )
        ];
    }

    // ******** OVERLAY ACTIONS ************

    public popoverClosed() { this.overlay.show= false }

    public formatPopover(id:string, coord:any, prj:any, list?:any) {
        if(!id) { this.overlay.show=false; return }

        this.overlay.content=[];
        this.overlay.id=null;    
        this.overlay.type=null;
        this.overlay.featureCount= this.draw.features.getLength(); 
        this.overlay.position= proj.transform(
            coord, 
            prj, 
            this.app.config.map.srid
        ); 
        let item= null;
        let t= id.split('.');

        switch(t[0]) {
            case 'list':
                this.overlay.type= 'list';
                this.overlay.title= 'Features'; 
                this.overlay.content= [];
                list.forEach( f=> this.overlay.content.push(f) );      
                this.overlay.show=true;
                return;         
            case 'vessels':
                this.overlay['type']= 'ais';
                this.overlay['isSelf']= true;      
                this.overlay['vessel']= this.dfeat.self;          
                this.overlay.show=true;
                return;
            case 'ais-vessels':
                this.overlay['type']= 'ais';
                this.overlay['isSelf']= false;  
                let aid= id.slice(4);
                if(!this.dfeat.ais.has(aid)) { return false }
                this.overlay['id']= aid; 
                this.overlay['vessel']= this.dfeat.ais.get(aid);
                this.overlay.show=true;
                return;
            case 'region':
                item= this.app.data.regions.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.overlay['id']= t[1];
                this.overlay['type']='region';
                this.overlay.title= 'Region';  
                this.overlay['resource']= item[0];          
                this.overlay.show=true;
                return;                
            case 'note':
                item= this.app.data.notes.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.overlay['id']= t[1];
                this.overlay['type']='note';
                this.overlay.title= 'Note'; 
                this.overlay['resource']= item[0];       
                this.overlay.show=true;
                return;              
            case 'route':
                item= this.app.data.routes.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.overlay['id']=t[1];
                this.overlay['type']='route';
                this.overlay.title= 'Route';
                this.overlay['resource']= item[0]; 
                this.overlay.show=true;
                return;                     
            case 'waypoint':
                item= this.app.data.waypoints.filter( i=>{ if(i[0]==t[1]) return true });
                if(!item) { return false }
                this.overlay['id']=t[1];                
                this.overlay['type']= 'waypoint';  
                this.overlay['resource']= item[0];          
                this.overlay.title= 'Waypoint'; 
                this.overlay.show=true;
                return;   
        }
    }   

    // ** handle seletion from the FeatureList popover */
    public featureListSelection(feature:any) {
        // trim the draw.features collection to the selected feature.id 
        let sf= new Collection();
        this.draw.features.forEach( e=> {
            if(e.getId()==feature.id) { sf.push(e) }
        });
        this.draw.features= sf;
        this.formatPopover(feature.id, feature.coord, feature.mrid)        
    }    

    // ** delete selected feature **
    public deleteFeature(id:string, type:string) {
        switch(type) {
            case 'waypoint':
                this.skres.showWaypointDelete({id: id});
                break;
            case 'route':
                this.skres.showRouteDelete({id: id});
                break;   
            case 'note':
                this.skres.showNoteDelete({id: id});
                break;    
            case 'region':
                this.skres.showRegionDelete({id: id});
                break;                              
        }
    }

    // ** activate route / waypoint
    public setActiveFeature() {
        if(this.overlay.type=='waypoint') {
            this.skres.navigateToWaypoint({id: this.overlay.id})
        }
        else { this.activate.emit(this.overlay.id) }
    }

    // ** deactivate route / waypoint
    public clearActiveFeature() { this.deactivate.emit(this.overlay.id) }
    
    // ** emit info event **
    public itemInfo(id:string, type:string, isSelf:boolean=false) { 
        if(type=='ais' && isSelf) { this.info.emit( {id: id, type: 'self' }) }
        else { this.info.emit({id: id, type: type }) }
    }

    public setActiveVessel(id:string=null) { this.focusVessel.emit(id)}
    
    // ******** DRAW / EDIT / MEASURE ************

    // ** Change Interaction mode **
    private interactionMode(mode: INTERACTION_MODE, value:any) { 
        if(mode==INTERACTION_MODE.MEASURE) {
            if(value==this.measure.enabled) { return }
            else {
                this.measure.coords= [];
                this.measure.totalDistance= 0;
                this.measure.enabled=value;
                this.overlay.show= false;
            }
        }
        else if(mode==INTERACTION_MODE.DRAW) {
            if(!value) {   // end draw mode
                if(this.draw.enabled) { this.drawEnd.emit({mode:'ended'}) }
                this.draw.enabled= false; 
                this.draw.features=null;
            }
            else if(value && this.draw.enabled) { return }
            else {      // enter draw mode
                this.draw.mode= value;
                this.draw.enabled= true;
                this.draw.features=null;
                this.draw.coordinates= null;
                switch(value) {
                    case 'waypoint':
                    case 'note':
                        this.draw.type= 'Point'
                        break;
                    case 'route':
                        this.draw.type= 'LineString'
                        break;    
                    case 'region':
                        this.draw.type= 'Polygon'
                        break;                              
                    default: 
                        this.draw.type= 'Point'
                }
                this.draw.forSave= null;
                this.draw.properties= {};
                this.draw.modify= false;
            }
        } 
        else if(mode==INTERACTION_MODE.MODIFY) {
            if(!value) {   // end modify mode
                this.draw.modify= false; 
                this.draw.features=null;
            }
            else if(value && this.draw.modify) { return }
            else { this.startModify() } // enter modify mode 
        }           
    }

    // ** Enter modify mode **
    public startModify() {
        if( this.draw.features.getLength()==0) { return }
        this.draw.type= null
        this.draw.mode= null;
        this.draw.forSave= null;
        this.draw.coordinates= null;
        this.draw.properties= {};
        this.draw.enabled= false;
        this.draw.modify= true;
        this.modifyStart.emit();      
    }

    // ********************************************************

    // Returns distance from last point 
    private measureDistanceToAdd(pt?:[number,number]) {
        if(pt && this.measure.coords.length>0) { // return distance between last point in array and pt
            return GeoUtils.distanceTo(
                this.measure.coords[this.measure.coords.length-1],
                pt
            );            
        }
        if(this.measure.coords.length>1) { // return distance between last two points in array
            return GeoUtils.distanceTo(
                this.measure.coords[this.measure.coords.length-2],
                this.measure.coords[this.measure.coords.length-1],
            );
        }
        else { return 0 }
    }   

    private isCoordsArray(ca:Array<[number,number]>) {
        if(Array.isArray(ca)) { return (Array.isArray(ca[0]) && typeof ca[0][0]==='number') }
        else { return false }
    }

    private transformCoordsArray(ca:Array<[number,number]>) {
        return ca.map( i=> { 
            return proj.transform(
                i, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            );
        });
    }       

    // ** returns true if skres.getNotes() should be called
    private fetchNotes() {
        this.app.debug(`lastGet: ${this.app.data.lastGet}`);
        this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);
        if(this.app.config.map.zoomLevel < this.app.config.selections.notesMinZoom) { return false }
        if(!this.app.data.lastGet) { 
            this.app.data.lastGet= this.app.config.map.center;
            return true; 
        }
        // ** calc distance from new map center to lastGet
        let d= GeoUtils.distanceTo(this.app.data.lastGet, this.app.config.map.center )
        this.app.debug(`distance map moved: ${d}`);
        // ** if d is more than half the getRadius
        let cr= (this.app.config.units.distance=='ft') ? 
            Convert.nauticalMilesToKm(this.app.config.resources.notes.getRadius) * 1000:
            this.app.config.resources.notes.getRadius * 1000;

        if(d>= cr/2 ) { 
            this.app.data.lastGet= this.app.config.map.center;
            return true; 
        }
        return false;    
    }       
}
