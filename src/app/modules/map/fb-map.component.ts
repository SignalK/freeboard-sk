import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

//import { proj, coordinate, style, Collection } from 'openlayers';
import { createStringXY } from 'ol/coordinate';
import { transform, transformExtent } from 'ol/proj';
import { Style, Stroke } from 'ol/style';
import { Collection } from 'ol';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { TEMPERATURE_GRADIENT } from 'src/app/lib/grib';

import { AppInfo } from 'src/app/app.info'
import { SKResources } from '../skresources/resources.service';
import { SKChart, SKVessel } from '../skresources/resource-classes';
import { SKStreamFacade } from '../skstream/skstream.facade';
import { OverlayContainer } from '@angular/cdk/overlay';

interface IResource {
    id: string;
    type: string;
}

interface IOverlay {
        id: string,
        type: string,
        position: any;
        show: boolean,
        title: string;
        content: any;
        featureCount: number;
}

interface IFeatureData {
    atons: Array<any>;
    routes: Array<any>;
    waypoints: Array<any>;
    charts: Array<any>;
    notes: Array<any>;
    regions: Array<any>;
    tracks: Array<any>;
    trail: Array<any>;
    self: SKVessel;   //self vessel
    ais: Map<string,any>;        // other vessels
    active: SKVessel;  // focussed vessel
    navData: any;
    closest: any;
    grib: any    // GRIB data
    colorGradient: any;
    heatmap: Array<any>;     // values to display on colormap / heatmap
}

const MAP_SRID:string= 'EPSG:4326';
const MAP_MAX_ZOOM:number= 28;
const MAP_MIN_ZOOM:number= 2;

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
    @Input() vesselTrail: Array<[number,number]>= [];
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
        style: new Style({
            stroke: new Stroke({
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
        anchor: [],
        trail: [],
        cpa: [],
        xtePath: []
    }

    public overlay:IOverlay = {
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
        northUp: true,
        extent: null
    }

    // ** map feature data
    dfeat: IFeatureData= {
        atons: [],
        routes: [],
        waypoints: [],
        charts: [],
        notes: [],
        regions: [],
        tracks: [],
        trail: [],
        self: new SKVessel(),   //self vessel
        ais: new Map(),         // other vessels
        active: new SKVessel(),  // focussed vessel
        navData: {position: null, startPosition: null},
        closest: {id: null, position: [0,0]},
        grib: { wind: [], temperature: [] },    // GRIB data
        colorGradient: TEMPERATURE_GRADIENT,
        heatmap: []     // values to display on colormap / heatmap
    }

    // ** AIS target management
    aisMgr= {
        updateList: [],
        staleList: [],
        removeList: []
    }

    // ** map layer display
    display= { 
        layer: {
            notes: false,
            wind: false,
            colormap: false,
            heatmap: false
        }
    }
    private saveTimer: any;
    private isDirty: boolean=false;

    public mouse= {
        pixel: null,
        coords: [0,0],
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
        this.aolMap.host.nativeElement.firstChild.focus();
        if(!this.app.config.map.mrid) { 
            this.app.config.map.mrid= this.aolMap.instance.getView().getProjection().getCode();
        }
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
                    this.renderMapContents();
                    if(!this.app.config.selections.trailFromServer) {
                        this.dfeat.trail= [];
                    }
                }
            })
        );     
    }

    ngOnDestroy() { 
        this.stopSaveTimer();
        this.obsList.forEach( i=> i.unsubscribe() );
    }

    ngOnChanges(changes) {
        if(changes.vesselTrail) { this.drawVesselLines() }        
        if(changes.setFocus && changes.setFocus.currentValue==true) { 
            this.aolMap.host.nativeElement.firstChild.focus();
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
        if(changes && changes.northUp) {
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

    // format WMS parameters
    wmsParams(chart: SKChart) {
        return {
            LAYERS: (chart.chartLayers) ? chart.chartLayers.join(',') : ''
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
    private checkedAtoNs:boolean= false;

    private onVessels() {
        //store last position incase new position is null
        let lastPos= this.dfeat.self.position;
        this.dfeat.self= this.app.data.vessels.self;
        if(!this.dfeat.self.position || !Array.isArray(this.dfeat.self.position)) {
            this.dfeat.self.position= lastPos;
        }
        this.dfeat.ais= this.app.data.vessels.aisTargets;
        this.dfeat.active= this.app.data.vessels.active;
        this.dfeat.navData.position= this.app.data.navData.position;
        this.dfeat.navData.startPosition= this.app.data.navData.startPosition;
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
            if( this.fbMap.extent[0]<180 && this.fbMap.extent[2]>180 ) {
                // if dateline is in view adjust overlay position to stay with vessel
                if(this.overlay.position[0]<0 && this.overlay.position[0]>-180) { 
                    this.overlay.position[0]= this.overlay.position[0] + 360;
                }
            }          
        }  
        if(!this.checkedAtoNs && this.app.data.atons.size!=0) { this.renderAtoNs(); this.checkedAtoNs=true; }
        this.drawVesselLines(true);
        this.rotateMap();  
        if(this.fbMap.movingMap) { this.centerVessel() }    
    }

    private onResourceUpdate(value:any) {
        this.app.debug('skres.update$ -> map.onResourceUpdate()');
        this.app.debug(value);
        if(value.action=='get' || value.action=='selected') {
            if(value.mode=='route') { 
                this.dfeat.routes= this.app.data.routes.filter( r=> {
                    let c= this.mapifyCoords(r[1].feature.geometry.coordinates);
                    r[1].feature.geometry.coordinates= c;
                    return true;
                });           
            }
            if(value.mode=='waypoint') { this.dfeat.waypoints= this.app.data.waypoints }
            if(value.mode=='chart') { this.dfeat.charts= this.app.data.charts }
            if(value.mode=='note') { 
                this.dfeat.notes= this.app.data.notes;
                this.dfeat.regions= [];
                this.app.data.regions.forEach( r=> {
                    if(r[1].feature.geometry.type=='Polygon') {
                        let i= JSON.parse(JSON.stringify(r));
                        i[1].feature.geometry.coordinates.forEach(p=> {
                            p= this.mapifyCoords(p);
                        });
                        this.dfeat.regions.push(i);
                    }
                    else if(r[1].feature.geometry.type=='MultiPolygon') {
                        let i= JSON.parse(JSON.stringify(r));
                        i[1].feature.geometry.coordinates.forEach(mp=> {
                            mp.forEach(p=> {
                                p= this.mapifyCoords(p);
                            });
                        });
                        this.dfeat.regions.push(i);
                    }                    
                });

            }
            if(value.mode=='grib') { this.renderGRIB() }
            if(value.mode=='track') { 
                this.dfeat.tracks= this.app.data.tracks.filter( t=> {
                    let lines= [];
                    t.feature.geometry.coordinates.forEach( line=> {
                        lines.push( this.mapifyCoords(line) );
                    })
                    t.feature.geometry.coordinates= lines;
                    return true;
                });
            }
            if(value.mode=='trail') { 
                this.dfeat.trail= value.data.map( line=> {
                    return this.mapifyCoords(line);
                });
            }            
        }
    }    

    // ********** MAP EVENT HANDLERS *****************    

    // Coordinate Format function (pointer position)
    pointerXYString() { return createStringXY(4) }

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

    // ** handle Map Tile load events **
    public onMapTileEvent(e:any) {
        //console.log(`tile event:`, e);
    }
    // ** handle error connecting to online map source **
    public onMapSourceConnectionError(e:any) {
        let mapsel= this.app.config.selections.charts;
        if(mapsel.includes('openstreetmap') || mapsel.includes('openseamap') ) {
            this.app.showAlert(
                'Map Service Unavailable: ', 
                `Unable to display Open Street / Sea Maps!\n
                Please check your Internet connection or select maps from the local network.\n
                `
            );
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
            if(!this.mouse.xy) { return }
            this.contextMenu.openMenu();   
            document.getElementsByClassName('cdk-overlay-backdrop')[0].addEventListener('contextmenu', (offEvent: any) => {
                offEvent.preventDefault();  // prevent default context menu for overlay
                this.contextMenu.closeMenu();
            }); 
        }
    }

    // ** handle map move **
    public onMapMove(e:any) {
        let v= e.map.getView();
        if(!this.app.config.map.mrid) { this.app.config.map.mrid= v.getProjection().getCode() }
        
        let z= Math.round(v.getZoom());
        this.app.config.map.zoomLevel=z;
        this.app.debug(`Zoom: ${z}`);

        this.fbMap.extent= transformExtent(
           v.calculateExtent(e.map.getSize()),
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );

        this.app.config.map.center= transform(
            v.getCenter(), 
            this.app.config.map.mrid, 
            this.app.config.map.srid
        );

        this.drawVesselLines();
        if(!this.fbMap.movingMap) { 
            this.app.saveConfig()
            this.isDirty=false;
        }
        else { this.isDirty=true }

        // render map features
        this.renderMapContents()
    }

    public onMapPointerMove(e:any) {
        this.mouse.pixel= e.pixel;
        this.mouse.xy= e.coordinate;
        this.mouse.coords= GeoUtils.normaliseCoords(
            transform(
                e.coordinate, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            )
        );
        if(this.measure.enabled && this.measure.coords.length!=0) {
            let c= transform(
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
            if(!this.app.config.popoverMulti) { this.overlay.show= false }
            let flist= new Map();
            let fa= [];
            // compile list of features at click location
            e.map.forEachFeatureAtPixel(
                e.pixel, 
                (feature, layer)=> {
                    let id= feature.getId();
                    let addToFeatureList: boolean= false;
                    let notForModify: boolean= false;
                    if(id) {
                        let t= id.split('.');
                        let icon: string;
                        let text: string;
                        switch(t[0]) {
                            case 'dest':
                                addToFeatureList= true;
                                icon= "flag";
                                text= "Destination";
                                break;
                            case 'note': 
                                icon= "local_offer"; 
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
                            case 'atons': 
                            case 'aton': 
                                icon="beenhere"; 
                                addToFeatureList= true;
                                let aton= this.app.data.atons.get(id);
                                text= (aton) ? aton.name || aton.mmsi : '';
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
                }, 
                { hitTolerance: 5 }
            );
            this.draw.features= new Collection(fa); // features collection for modify interaction
            if(flist.size==1) {   // only 1 feature
                let v= flist.values().next().value;
                if(v['id'].indexOf('dest')!=-1) {
                    this.itemInfo(v['id'], 'dest');
                }
                else {
                    this.formatPopover( 
                        v['id'],
                        v['coord'],
                        v['mrid']
                    );
                } 
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
        let c= transform(
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
        let c= transform(
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
                this.draw.coordinates= transform(
                    e.feature.getGeometry().getCoordinates(), 
                    this.app.config.map.mrid, 
                    this.app.config.map.srid
                );     
                break;
            case 'LineString':
                let rc= e.feature.getGeometry().getCoordinates();
                c= rc.map( i=> { 
                    return transform(
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
                    return transform(
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
            pc= transform(
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

    public drawVesselLines(vesselUpdate:boolean=false) {
        let z= this.app.config.map.zoomLevel;
        let offset= (z<29) ? this.zoomOffsetLevel[z] : 60;
        let wMax= 10;   // ** max line length

        // vessel trail
        if(this.app.data.trail) {
            this.vesselLines.trail= [].concat(this.app.data.trail);
            if(vesselUpdate) {
                this.vesselLines.trail.push(this.dfeat.active.position);
            }
            this.vesselLines.trail= this.mapifyCoords(this.vesselLines.trail);
        }

        // ** xtePath **
        let xtePath= null;
        if( (this.dfeat.navData.startPosition && typeof this.dfeat.navData.startPosition[0]=='number') 
            &&  (this.dfeat.navData.position && typeof this.dfeat.navData.position[0]=='number')
        ) {
            this.vesselLines.xtePath= this.mapifyCoords([
                this.dfeat.navData.startPosition,
                this.dfeat.navData.position
            ]); 
        }
        else { this.vesselLines.xtePath }

        // ** bearing line (active) **
        let bpos= (this.dfeat.navData.position && typeof this.dfeat.navData.position[0]=='number') ? 
            this.dfeat.navData.position : this.dfeat.active.position;
        this.vesselLines.bearing= this.mapifyCoords(
            [this.dfeat.active.position, bpos]
        ); 

        // ** anchor line (active) **
        if(!this.app.config.anchor.raised) {
            this.vesselLines.anchor= this.mapifyCoords(
                [this.app.config.anchor.position, this.dfeat.active.position]
            );
        }          
        
        // ** CPA line **
        this.vesselLines.cpa= this.mapifyCoords(
            [this.dfeat.closest.position, this.dfeat.self.position]
        );        

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
        this.vesselLines.twd= [
            this.dfeat.active.position, 
            GeoUtils.destCoordinate(
                this.dfeat.active.position[1],
                this.dfeat.active.position[0],
                this.dfeat.active.wind.direction || 0,
                (this.dfeat.active.wind.direction) ? tws * offset : 0
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
        this.overlay.position= transform(
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
            case 'atons':
            case 'aton':
                this.overlay['type']= 'aton';
                if(!this.app.data.atons.has(id)) { return false }
                this.overlay['id']= id;
                this.overlay['aton']= this.app.data.atons.get(id);
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
        if(feature.id.indexOf('dest')!=-1) {
            this.itemInfo(feature.id, 'dest');
            this.overlay.show= false;
        }
        else { this.formatPopover(feature.id, feature.coord, feature.mrid) }
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
            this.overlay.show= false;
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
            return transform(
                i, 
                this.app.config.map.mrid, 
                this.app.config.map.srid
            );
        });
    } 
    
    // update line coords for map display (dateline crossing)
    private mapifyCoords(coords) {
        if(coords.length==0) { return coords }
        let dlCrossing= 0;
        let last= coords[0];
        for(let i=0; i< coords.length; i++) {         
            if( GeoUtils.inDLCrossingZone(coords[i]) || GeoUtils.inDLCrossingZone(last) ) {
                dlCrossing= (last[0]>0 && coords[i][0]<0) ? 1 
                    : (last[0]<0 && coords[i][0]>0) ? -1 : 0;
                if(dlCrossing==1) { coords[i][0]= coords[i][0] + 360}
                if(dlCrossing==-1) { coords[i][0]= Math.abs(coords[i][0])-360 }
            } 
        }
        return coords;
    }   

    // ** called by onMapMove() to render features within map extent
    private renderMapContents() {
        if(this.fetchNotes()) {this.skres.getNotes();this.app.debug(`fetching Notes...`) }
        this.renderAtoNs();
        this.renderGRIB();
    }

    // ** returns true if skres.getNotes() should be called
    private fetchNotes() {
        this.display.layer.notes= (this.app.config.notes && this.app.config.map.zoomLevel>=this.app.config.selections.notesMinZoom);

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
    
    // filter AtoNs within map extent to render
    private renderAtoNs() {
        this.dfeat.atons= [];
        this.app.data.atons.forEach( v=> {
            if(GeoUtils.inBounds(v.position, this.fbMap.extent)) {
                this.dfeat.atons.push(v);
            }
        })
    }

    // filter GRIB resources within map extent to render
    private renderGRIB() {
        if(this.app.data.grib.values.wind) {
            this.dfeat.grib.wind= this.app.data.grib.values.wind.filter( i=> {
                return (GeoUtils.inBounds(i.coord, this.fbMap.extent));
            });
        }
        this.display.layer.wind= (this.dfeat.grib.wind.length>0 && this.app.config.map.zoomLevel>=4);

        if(this.app.data.grib.values.temperature) {
            this.dfeat.heatmap= this.app.data.grib.values.temperature.filter( i=> {
                return (GeoUtils.inBounds(i.coord, this.fbMap.extent));
            });
        }
        this.display.layer.colormap= (this.dfeat.heatmap.length>0 && this.app.config.map.zoomLevel>=4);
    }
}
