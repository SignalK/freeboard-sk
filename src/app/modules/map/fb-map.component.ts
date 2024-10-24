import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

// ** OL & popvers **
import {
  PopoverComponent,
  FeatureListPopoverComponent,
  AtoNPopoverComponent,
  AircraftPopoverComponent,
  AlarmPopoverComponent,
  ResourcePopoverComponent,
  ResourceSetPopoverComponent,
  VesselPopoverComponent
} from './popovers';
import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { PipesModule } from 'src/app/lib/pipes';

import { computeDestinationPoint, getGreatCircleBearing } from 'geolib';
import { toLonLat } from 'ol/proj';
import { Style, Stroke, Fill } from 'ol/style';
import { Collection, Feature } from 'ol';
import { Feature as GeoJsonFeature } from 'geojson';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils, Angle } from 'src/app/lib/geoutils';
import { FBChart, FBRoute, FBWaypoint, Position } from 'src/app/types';

import { AppInfo } from 'src/app/app.info';
import { SettingsMessage } from 'src/app/lib/services';
import {
  SKResources,
  SKOtherResources,
  SKChart,
  SKRoute,
  SKWaypoint,
  SKNote,
  SKRegion,
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo,
  SKStreamFacade,
  AlarmsFacade
} from 'src/app/modules';
import {
  mapInteractions,
  mapControls,
  vesselStyles,
  aisVesselStyles,
  atonStyles,
  basestationStyles,
  aircraftStyles,
  sarStyles,
  meteoStyles,
  waypointStyles,
  routeStyles,
  noteStyles,
  anchorStyles,
  alarmStyles,
  destinationStyles,
  laylineStyles,
  drawStyles,
  targetAngleStyle,
  raceCourseStyles
} from './mapconfig';
import { ModifyEvent } from 'ol/interaction/Modify';
import { DrawEvent } from 'ol/interaction/Draw';
import { Coordinate } from 'ol/coordinate';
import {
  FBCharts,
  FBNotes,
  FBRoutes,
  FBWaypoints,
  ResourceSets,
  SKNotification
} from 'src/app/types';
import { S57Service } from './ol/lib/s57.service';
import { Position as SKPosition } from '@signalk/server-api';

interface IResource {
  id: string;
  type: string;
}

interface IOverlay {
  id: string;
  type: string;
  position: Coordinate;
  show: boolean;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  featureCount: number;
  resource?:
    | [string, SKRoute | SKWaypoint | SKNote | SKRegion]
    | GeoJsonFeature;
  vessel?: SKVessel;
  isSelf?: boolean;
  aton?: SKAtoN;
  meteo?: SKMeteo;
  aircraft?: SKAircraft;
  alarm?: SKNotification;
}

interface IFeatureData {
  aircraft: Map<string, SKAircraft>;
  atons: Map<string, SKAtoN>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
  routes: FBRoutes;
  waypoints: FBWaypoints;
  charts: FBCharts;
  notes: FBNotes;
  regions: Array<SKRegion>;
  tracks: Array<Position[]>; // self track(s) from server
  trail: Array<Position>; // self trail (appended to tracks)
  self: SKVessel; //self vessel
  ais: Map<string, SKVessel>; // other vessels
  active: SKVessel; // focussed vessel
  navData: { position: Position; startPosition: Position };
  closest: { id: string; position: Position };
  resourceSets: ResourceSets;
}

interface IDrawInfo {
  enabled: boolean;
  style: Style | Style[] | undefined;
  mode: string | null;
  type: 'Point' | 'LineString' | 'Polygon';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinates: any[];
  modify: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forSave: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: { [key: string]: any };
}

interface IMeasureInfo {
  enabled: boolean;
  end: boolean;
  style: Style | Style[];
  totalDistance: number;
  coords: Position[];
}

enum INTERACTION_MODE {
  MEASURE,
  DRAW,
  MODIFY
}

@Component({
  selector: 'fb-map',
  standalone: true,
  imports: [
    CommonModule,
    MatTooltipModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PipesModule,
    MatCardModule,
    MatMenuModule,
    FreeboardOpenlayersModule,
    PopoverComponent,
    FeatureListPopoverComponent,
    AtoNPopoverComponent,
    AircraftPopoverComponent,
    AlarmPopoverComponent,
    ResourcePopoverComponent,
    ResourceSetPopoverComponent,
    VesselPopoverComponent
  ],
  templateUrl: './fb-map.component.html',
  styleUrls: ['./fb-map.component.css']
})
export class FBMapComponent implements OnInit, OnDestroy {
  @Input() setFocus: boolean;
  @Input() mapCenter: Position = [0, 0];
  @Input() mapZoom = 1;
  @Input() movingMap = false;
  @Input() northUp = true;
  @Input() measureMode = false;
  @Input() drawMode: string = null;
  @Input() modifyMode = false;
  @Input() activeRoute: string;
  @Input() vesselTrail: Array<Position> = [];
  @Input() dblClickZoom = false;
  @Output() measureStart: EventEmitter<boolean> = new EventEmitter();
  @Output() measureEnd: EventEmitter<boolean> = new EventEmitter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() drawEnd: EventEmitter<any> = new EventEmitter();
  @Output() modifyStart: EventEmitter<{ id: string; type: string }> =
    new EventEmitter();
  @Output() modifyEnd: EventEmitter<Array<Position>> = new EventEmitter();
  @Output() activate: EventEmitter<string> = new EventEmitter();
  @Output() deactivate: EventEmitter<string> = new EventEmitter();
  @Output() info: EventEmitter<IResource> = new EventEmitter();
  @Output() exitedMovingMap: EventEmitter<boolean> = new EventEmitter();
  @Output() focusVessel: EventEmitter<string> = new EventEmitter();
  @Output() menuItemSelected: EventEmitter<string> = new EventEmitter();

  @ViewChild(MatMenuTrigger, { static: true }) contextMenu: MatMenuTrigger;

  // ** draw interaction data
  public draw: IDrawInfo = {
    enabled: false,
    style: drawStyles.default,
    mode: null,
    type: 'Point',
    coordinates: null,
    modify: false,
    features: null,
    forSave: null,
    properties: {}
  };

  // ** measure interaction data
  public measure: IMeasureInfo = {
    enabled: false,
    end: false,
    style: drawStyles.measure,
    totalDistance: 0,
    coords: []
  };

  public vesselLines = {
    twd: [],
    awa: [],
    bearing: [],
    heading: [],
    anchor: [],
    trail: [],
    cpa: [],
    xtePath: [],
    laylines: { port: [], starboard: [] },
    targetAngle: []
  };

  public overlay: IOverlay = {
    id: null,
    type: null,
    position: [0, 0],
    show: false,
    title: '',
    content: null,
    featureCount: 0
  };

  private zoomOffsetLevel = [
    1, 1000000, 550000, 290000, 140000, 70000, 38000, 17000, 7600, 3900, 1900,
    950, 470, 250, 120, 60, 30, 15.5, 8.1, 4, 2, 1, 0.5, 0.25, 0.12, 0.06, 0.03,
    0.015, 0.008, 1
  ];

  // ** map ctrl **
  fbMap = {
    rotation: 0,
    center: [0, 0],
    zoomLevel: 1,
    movingMap: false,
    northUp: true,
    extent: null,
    interactions: mapInteractions,
    controls: mapControls,
    focus: false
  };

  // ** map feature styles
  featureStyles = {
    vessel: vesselStyles,
    aisVessel: aisVesselStyles,
    note: noteStyles,
    route: routeStyles,
    waypoint: waypointStyles,
    anchor: anchorStyles,
    alarm: alarmStyles,
    destination: destinationStyles,
    aton: atonStyles,
    basestation: basestationStyles,
    aircraft: aircraftStyles,
    sar: sarStyles,
    meteo: meteoStyles,
    layline: laylineStyles,
    targetAngle: targetAngleStyle,
    raceCourse: raceCourseStyles
  };

  // ** map feature data
  dfeat: IFeatureData = {
    aircraft: new Map(),
    atons: new Map(),
    sar: new Map(),
    meteo: new Map(),
    routes: [],
    waypoints: [],
    charts: [],
    notes: [],
    regions: [],
    tracks: [], // self track(s) from server
    trail: [], // self trail (appended to tracks)
    self: new SKVessel(), //self vessel
    ais: new Map(), // other vessels
    active: new SKVessel(), // focussed vessel
    navData: { position: null, startPosition: null },
    closest: { id: null, position: [0, 0] },
    resourceSets: {}
  };

  // ** AIS target management
  aisMgr = {
    updateList: [],
    staleList: [],
    removeList: []
  };

  // ** map layer display
  display = {
    layer: {
      notes: false,
      wind: false,
      colormap: false,
      heatmap: false
    }
  };
  private saveTimer;
  private isDirty = false;

  public mouse = {
    pixel: null,
    coords: [0, 0],
    xy: null
  };
  contextMenuPosition = { x: '0px', y: '0px' };

  private obsList = [];

  constructor(
    public app: AppInfo,
    public s57Service: S57Service,
    public skres: SKResources,
    public skresOther: SKOtherResources,
    private skstream: SKStreamFacade,
    private alarmsFacade: AlarmsFacade
  ) {}

  ngAfterViewInit() {
    // ** set map focus **
    setTimeout(() => {
      this.fbMap.focus = true;
      setTimeout(() => (this.fbMap.focus = false), 500);
    }, 500);
  }

  ngOnInit() {
    // ** STREAM VESSELS update event
    this.obsList.push(
      this.skstream.vessels$().subscribe(() => this.onVessels())
    );
    this.obsList.push(
      this.skstream.trail$().subscribe((value) => this.onResourceUpdate(value))
    );
    // ** RESOURCES update event
    this.obsList.push(
      this.skres.update$().subscribe((value) => this.onResourceUpdate(value))
    );
    this.obsList.push(
      this.skresOther
        .update$()
        .subscribe((value) => this.onResourceUpdate(value))
    );
    // ** SETTINGS **
    this.obsList.push(
      this.app.settings$.subscribe((r: SettingsMessage) => {
        if (r.action === 'save' && r.setting === 'config') {
          this.fbMap.movingMap = this.app.config.map.moveMap;
          this.s57Service.SetOptions(this.app.config.selections.s57Options);
          this.renderMapContents();
          if (!this.app.config.selections.trailFromServer) {
            this.dfeat.trail = [];
          }
        }
      })
    );
    // Initialise charts
    this.dfeat.charts = [].concat(this.app.data.charts);
  }

  ngOnDestroy() {
    this.stopSaveTimer();
    this.obsList.forEach((i) => i.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.vesselTrail) {
      this.drawVesselLines();
    }
    if (changes.setFocus) {
      this.fbMap.focus = changes.setFocus.currentValue;
    }
    if (changes && changes.mapCenter) {
      this.fbMap.center = changes.mapCenter.currentValue
        ? changes.mapCenter.currentValue
        : this.fbMap.center;
    }
    if (changes && changes.mapZoom) {
      this.fbMap.zoomLevel = changes.mapZoom.currentValue
        ? changes.mapZoom.currentValue
        : this.fbMap.zoomLevel;
    }
    if (changes && changes.movingMap && !changes.movingMap.firstChange) {
      this.fbMap.movingMap = changes.movingMap.currentValue;
      if (this.fbMap.movingMap) {
        this.startSaveTimer();
      } else {
        this.stopSaveTimer();
      }
      this.centerVessel();
    }
    if (changes && changes.northUp) {
      this.fbMap.northUp = changes.northUp.currentValue;
      this.rotateMap();
    }
    if (changes && changes.measureMode && !changes.measureMode.firstChange) {
      this.interactionMode(
        INTERACTION_MODE.MEASURE,
        changes.measureMode.currentValue
      );
    }
    if (changes && changes.drawMode && !changes.drawMode.firstChange) {
      this.interactionMode(
        INTERACTION_MODE.DRAW,
        changes.drawMode.currentValue
      );
    }
    if (changes && changes.modifyMode && !changes.modifyMode.firstChange) {
      this.interactionMode(
        INTERACTION_MODE.MODIFY,
        changes.modifyMode.currentValue
      );
    }
    if (changes && changes.measureMode) {
      if (changes.measureMode.currentValue) {
        this.overlay.type = 'measure';
      }
    }
    if (changes && changes.dblClickZoom) {
      this.toggleDblClickZoom(changes.dblClickZoom.currentValue);
    }
  }

  // format WMS parameters
  wmsParams(chart: SKChart) {
    return {
      LAYERS: chart.layers ? chart.layers.join(',') : ''
    };
  }

  // ** periodically persist state (used in movingMap mode)
  private startSaveTimer() {
    if (!this.saveTimer) {
      this.saveTimer = setInterval(() => {
        if (this.isDirty) {
          this.app.saveConfig(true);
          this.isDirty = false;
        }
      }, 30000);
    }
  }

  private stopSaveTimer() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // ********** EVENT HANDLERS *****************

  private onVessels() {
    //store last position incase new position is null
    const lastPos = this.dfeat.self.position;
    this.dfeat.self = this.app.data.vessels.self;
    if (!this.dfeat.self.position || !Array.isArray(this.dfeat.self.position)) {
      this.dfeat.self.position = lastPos;
    }
    this.dfeat.ais = this.app.data.vessels.aisTargets;
    this.dfeat.aircraft = this.app.data.aircraft;
    this.dfeat.sar = this.app.data.sar;
    this.dfeat.meteo = this.app.data.meteo;
    this.dfeat.atons = this.app.data.atons;
    this.dfeat.active = this.app.data.vessels.active;
    this.dfeat.navData.position = this.app.data.navData.position;
    this.dfeat.navData.startPosition = this.app.data.navData.startPosition;
    this.dfeat.closest = {
      id: this.app.data.vessels.closest.id,
      position: this.app.data.vessels.closest.position
    };
    this.aisMgr = this.app.data.aisMgr;

    // ** update vessel on map **
    if (this.dfeat.self['positionReceived']) {
      this.app.data.vessels.showSelf = true;
    }
    // ** locate vessel popover
    if (
      this.overlay.show &&
      ['ais', 'aton', 'aircraft'].includes(this.overlay.type)
    ) {
      if (this.overlay['isSelf']) {
        this.overlay.position = this.dfeat.self.position;
        this.overlay['vessel'] = this.dfeat.self;
      } else {
        if (
          (this.overlay.type === 'ais' &&
            !this.dfeat.ais.has(this.overlay.id)) ||
          (this.overlay.type === 'atons' &&
            !this.dfeat.atons.has(this.overlay.id)) ||
          (this.overlay.type === 'aircraft' &&
            !this.dfeat.aircraft.has(this.overlay.id))
        ) {
          this.overlay.show = false;
        } else {
          if (this.overlay.type === 'ais') {
            this.overlay['vessel'] = this.dfeat.ais.get(this.overlay.id);
            this.overlay.position = this.overlay['vessel'].position;
          }
        }
      }
      if (this.fbMap.extent[0] < 180 && this.fbMap.extent[2] > 180) {
        // if dateline is in view adjust overlay position to stay with vessel
        if (this.overlay.position[0] < 0 && this.overlay.position[0] > -180) {
          this.overlay.position[0] = this.overlay.position[0] + 360;
        }
      }
    }
    this.drawVesselLines(true);
    this.rotateMap();
    if (this.fbMap.movingMap) {
      this.centerVessel();
    }
  }

  private onResourceUpdate(value) {
    this.app.debug('skres.update$ -> map.onResourceUpdate()');
    this.app.debug(value);
    if (value.action === 'get' || value.action === 'selected') {
      if (value.mode === 'route') {
        this.dfeat.routes = [].concat(this.app.data.routes);
        if (this.app.data.n2kRoute) {
          this.dfeat.routes.push(this.app.data.n2kRoute);
        }
      }
      if (value.mode === 'waypoint') {
        this.dfeat.waypoints = [].concat(this.app.data.waypoints);
      }
      if (value.mode === 'chart') {
        this.dfeat.charts = [].concat(this.app.data.charts);
      }
      if (value.mode === 'region') {
        this.dfeat.regions = [].concat(this.app.data.regions);
      }
      if (value.mode === 'note') {
        this.dfeat.notes = [].concat(this.app.data.notes);
        this.dfeat.regions = [].concat(this.app.data.regions);
      }
      if (value.mode === 'track') {
        // track resources
        this.dfeat.tracks = [].concat(this.app.data.tracks);
      }
      if (value.mode === 'trail') {
        // vessel trail
        if (this.app.config.selections.trailFromServer) {
          this.dfeat.trail = value.data;
        }
      }
      if (value.mode === 'resource-set') {
        this.dfeat.resourceSets = Object.assign({}, this.app.data.resourceSets);
      }
    }
  }

  // ********** MAP EVENT HANDLERS *****************

  toggleDblClickZoom(set?: boolean) {
    if (set) {
      this.fbMap.interactions = [{ name: 'doubleclickzoom' }].concat(
        mapInteractions
      );
    } else {
      this.fbMap.interactions = [].concat(mapInteractions);
    }
  }

  // ** handle context menu choices **
  public onContextMenuAction(action: string, e: Position) {
    switch (action) {
      case 'add_wpt':
        this.skres.showWaypointEditor({ position: e });
        break;
      case 'add_note':
        this.skres.showNoteEditor({ position: e });
        break;
      case 'nav_to':
        this.app.data.activeWaypoint = null;
        this.app.data.navData.pointNames = [];
        this.skres.setDestination({
          latitude: e[1],
          longitude: e[0]
        });
        break;
      case 'measure':
        this.measureStart.emit(true);
        break;
      default:
        this.menuItemSelected.emit(action);
        break;
    }
  }

  // ** handle mouse right click **
  public onMapMouseRightClick(e) {
    this.app.data.map.atClick = e;
    this.app.debug(this.app.data.map.atClick);
  }

  // ** handle context menu **
  public onContextMenu(e) {
    if (this.app.data.map.suppressContextMenu) {
      return;
    }
    e.preventDefault();
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
    this.contextMenu.menuData = { item: this.mouse.coords };
    if (this.measureMode && this.measure.coords.length !== 0) {
      this.onMeasureClick(this.mouse.xy.lonlat);
    } else if (!this.modifyMode) {
      if (!this.mouse.xy) {
        return;
      }
      this.contextMenu.openMenu();
      document
        .getElementsByClassName('cdk-overlay-backdrop')[0]
        .addEventListener('contextmenu', (offEvent) => {
          offEvent.preventDefault(); // prevent default context menu for overlay
          this.contextMenu.closeMenu();
        });
    }
  }

  // parse zoom level change
  parseZoomChange(zoom: number) {
    this.app.config.map.zoomLevel = zoom;
  }

  // ** handle map move **
  public onMapMove(e) {
    this.parseZoomChange(e.zoom);

    this.fbMap.extent = e.extent;
    this.app.config.map.center = e.lonlat;

    this.drawVesselLines();
    if (!this.fbMap.movingMap) {
      this.app.saveConfig(true);
      this.isDirty = false;
    } else {
      this.isDirty = true;
    }

    // render map features
    this.renderMapContents();
  }

  public onMapPointerMove(e) {
    this.mouse.pixel = e.pixel;
    this.mouse.xy = e.coordinate;
    this.mouse.coords = GeoUtils.normaliseCoords(e.lonlat);
    if (this.measure.enabled && this.measure.coords.length !== 0) {
      const c = e.lonlat;
      this.overlay.position = c;
      const lm = this.measureDistanceToAdd(c);
      const b = getGreatCircleBearing(this.measure.coords.slice(-1)[0], c);
      this.overlay.title =
        this.app.formatValueForDisplay(lm, 'm') +
        ' ' +
        this.app.formatValueForDisplay(b, 'deg');
    }
  }

  public onMapPointerDrag() {
    if (!this.app.config.map.lockMoveMap) {
      this.fbMap.movingMap = false;
      this.exitedMovingMap.emit(true);
    }
  }

  // toggle display of resource feature
  toggleFeatureSelection(
    id: string,
    resType: 'charts' | 'routes' | 'waypoints'
  ) {
    this.app.data[resType].forEach((r: FBChart | FBRoute | FBWaypoint) => {
      if (r[0] === id) {
        r[2] = !r[2];
      }
    });
    switch (resType) {
      case 'charts':
        this.skres.chartSelected();
        break;
      case 'routes':
        this.skres.routeSelected();
        break;
      case 'waypoints':
        this.skres.waypointSelected();
    }
  }

  public onMapMouseClick(e) {
    this.app.data.map.atClick = {
      features: e.features,
      lonlat: e.lonlat
    };
    if (this.measure.enabled && this.measure.coords.length !== 0) {
      this.onMeasureClick(e.lonlat);
    } else if (this.draw.enabled && this.draw.mode === 'route') {
      this.onDrawClick(e.features);
    } else if (!this.draw.enabled && !this.draw.modify) {
      if (!this.app.config.popoverMulti) {
        this.overlay.show = false;
      }
      const flist = new Map();
      const fa = [];
      let maskPopover = false;
      // process list of features at click location
      e.features.forEach((feature: Feature) => {
        const id = feature.getId();
        let addToFeatureList = false;
        let aton: SKAtoN;
        let sar: SKSaR;
        let meteo: SKMeteo;
        let aircraft: SKAircraft;
        let vessel: SKVessel;
        if (id && typeof id === 'string') {
          const t = id.split('.');
          let icon: string;
          let text: string;

          if (t[0] === 'chart-backdrop') {
            maskPopover = true;
            return;
          }
          if (t[0] === 'chart-bound') {
            this.toggleFeatureSelection(t[1], 'charts');
            return;
          }
          switch (t[0]) {
            case 'rset':
              addToFeatureList = true;
              icon = 'star';
              text = feature.get('name');
              break;
            case 'alarm':
              addToFeatureList = true;
              icon = 'notification_important';
              text = `${t[1]} ${t[0]}`;
              break;
            case 'anchor':
              addToFeatureList = true;
              icon = 'anchor';
              text = `${t[0]}`;
              break;
            case 'dest':
              addToFeatureList = true;
              icon = 'flag';
              text = 'Destination';
              break;
            case 'note':
              icon = 'local_offer';
              addToFeatureList = true;
              text = this.app.data.notes.filter((i) => {
                return i[0] === t[1] ? i[1].name : null;
              })[0][1].name;
              break;
            case 'route':
              icon = 'directions';
              addToFeatureList = true;
              if (t[1] === 'n2k') {
                text = this.app.data.n2kRoute
                  ? this.app.data.n2kRoute[1].name
                  : '';
              } else {
                text = this.app.data.routes.filter((i) => {
                  return i[0] === t[1] ? i[1].name : null;
                })[0][1].name;
              }
              break;
            case 'waypoint':
              icon = 'location_on';
              addToFeatureList = true;
              text = this.app.data.waypoints.filter((i) => {
                return i[0] === t[1] ? i[1].name : null;
              })[0][1].name;
              break;
            case 'atons':
            case 'aton':
            case 'shore':
              icon = 'beenhere';
              addToFeatureList = true;
              aton = this.app.data.atons.get(id);
              text = aton ? aton.name || aton.mmsi : '';
              break;
            case 'sar':
              icon = 'tour';
              addToFeatureList = true;
              sar = this.app.data.sar.get(id);
              text = sar ? sar.name || sar.mmsi : 'SaR Beacon';
              break;
            case 'meteo':
              icon = 'air';
              addToFeatureList = true;
              meteo = this.app.data.meteo.get(id);
              text = meteo ? meteo.name || meteo.mmsi : 'Weather Station';
              break;
            case 'ais-vessels':
              icon = 'directions_boat';
              addToFeatureList = true;
              vessel = this.dfeat.ais.get(`vessels.${t[1]}`);
              text = vessel ? vessel.name || vessel.mmsi : '';
              break;
            case 'vessels':
              icon = 'directions_boat';
              addToFeatureList = true;
              text = this.dfeat.self.name
                ? this.dfeat.self.name + ' (self)'
                : 'self';
              break;
            case 'region':
              addToFeatureList = true;
              icon = '360';
              text = 'Region';
              break;
            case 'aircraft':
              icon = 'airplanemode_active';
              addToFeatureList = true;
              aircraft = this.app.data.aircraft.get(id);
              text = aircraft ? aircraft.name || aircraft.mmsi : '';
              break;
          }
          if (addToFeatureList && !flist.has(id)) {
            flist.set(id, {
              id: id,
              coord: e.lonlat,
              icon: icon,
              text: text
            });
            fa.push(feature);
          }
        }
      });
      if (maskPopover) {
        return;
      }
      this.draw.features = new Collection(fa); // features collection for modify interaction
      if (flist.size === 1) {
        // only 1 feature
        const v = flist.values().next().value;
        this.formatPopover(v['id'], v['coord']);
      } else if (flist.size > 1) {
        //show list of features
        this.formatPopover('list.', e.lonlat, flist);
      }
    }
  }

  // ** Map Interaction events **
  public onDrawClick(fa: Feature[]) {
    if (!Array.isArray(fa)) {
      return;
    }
    if (this.draw.mode === 'route') {
      let rPoints: Position[];
      fa.forEach((f: Feature) => {
        if (f.getGeometry().getType() === 'LineString') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rPoints = (f.getGeometry() as any)
            .getCoordinates()
            .map((c: Position) => toLonLat(c));
          rPoints = rPoints.slice(0, rPoints.length - 1);
        }
      });
      this.app.data.measurement.coords = rPoints;
    }
  }

  public onMeasureStart(e: DrawEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let c = (e.feature.getGeometry() as any)
      .getCoordinates()
      .map((c: Position) => toLonLat(c));
    c = c.slice(0, c.length - 1);
    this.measure.coords = c;
    this.formatPopover(null, null);
    this.overlay.position = c;
    this.overlay.title = '0';
    this.overlay.show = true;
  }

  public onMeasureClick(pt: Position) {
    if (!Array.isArray(pt)) {
      return;
    }
    const lastPt = this.measure.coords[this.measure.coords.length - 1];
    if (pt[0] === lastPt[0] && pt[1] === lastPt[1]) {
      return;
    }
    this.measure.coords.push(pt);
    this.overlay.position = pt;

    const lm = this.measureDistanceToAdd();
    this.measure.totalDistance += lm;
    let b = 0;
    // ** update measurement data
    const c = this.measure.coords.slice(-2);
    b = getGreatCircleBearing(c[0], c[1]);
    this.app.data.measurement.coords = this.measure.coords.slice();

    this.overlay.title =
      this.app.formatValueForDisplay(lm, 'm') +
      ' ' +
      this.app.formatValueForDisplay(b, 'deg');
  }

  public onMeasureEnd() {
    this.overlay.show = false;
    this.measure.enabled = false;
    this.measureEnd.emit(true);
  }

  public onDrawEnd(e) {
    this.draw.enabled = false;
    let c;
    let p;
    let rc;
    switch (this.draw.type) {
      case 'Point':
        this.draw.coordinates = toLonLat(
          e.feature.getGeometry().getCoordinates()
        );
        break;
      case 'LineString':
        rc = e.feature.getGeometry().getCoordinates();
        c = rc.map((i) => {
          return toLonLat(i);
        });
        this.draw.coordinates = c;
        break;
      case 'Polygon': // region
        p = e.feature.getGeometry().getCoordinates();
        if (p.length === 0) {
          this.draw.coordinates = [];
        }
        c = p[0].map((i) => {
          return toLonLat(i);
        });
        this.draw.coordinates = c;
        break;
    }
    this.drawEnd.emit(this.draw);
  }

  public onModifyStart(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    this.draw.coordinates = f.getGeometry().getCoordinates();
    if (!this.draw.forSave) {
      // initialise save info
      this.draw.forSave = { id: null, coords: null };
      this.draw.forSave.id = f.getId();
      if (f.getGeometry().getType() === 'LineString') {
        const meta = f.get('pointMetadata');
        if (meta) {
          this.draw.forSave.coordsMetadata = meta;
        }
      }
    }
  }

  public onModifyEnd(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    const fid = f.getId();
    const c = f.getGeometry().getCoordinates();
    if (f.getGeometry().getType() === 'LineString') {
      this.updateCoordsMeta(
        this.draw.coordinates,
        c,
        this.draw.forSave.coordsMetadata
      );
    }
    let pc;
    if (fid.split('.')[0] === 'route') {
      pc = this.transformCoordsArray(c);
      this.app.data.measurement.coords = pc;
    } else if (fid.split('.')[0] === 'region') {
      for (let e = 0; e < c.length; e++) {
        if (this.isCoordsArray(c[e])) {
          c[e] = this.transformCoordsArray(c[e]);
        } else {
          for (let p = 0; p < c[e].length; p++) {
            if (this.isCoordsArray(c[e][p])) {
              c[e][p] = this.transformCoordsArray(c[e][p]);
            } else {
              console.log('Invalid polygon coordinates!');
            }
          }
        }
      }
      pc = c;
    } else {
      // point feature
      pc = toLonLat(c);
      // shift anchor
      if (fid === 'anchor') {
        this.alarmsFacade
          .anchorEvent({ action: 'position' }, undefined, pc)
          .catch(() => {
            this.app.showAlert('Alert', 'Error shifting anchor position!');
          });
      }
    }
    this.draw.forSave['coords'] = pc;
    this.modifyEnd.emit(this.draw.forSave);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateCoordsMeta(startCoords: any[], endCoords: any[], meta: any[]) {
    if (!meta) {
      return;
    }
    const mode =
      endCoords.length > startCoords.length
        ? 'ADD'
        : endCoords.length < startCoords.length
        ? 'DELETE'
        : 'MOVE';

    function stringifyCoords(coords: Coordinate[]): string[] {
      return coords.map((c: Coordinate) => {
        return `${c[0]} - ${c[1]}`;
      });
    }

    if (mode === 'MOVE') {
      return meta;
    }
    startCoords = stringifyCoords(startCoords);
    endCoords = stringifyCoords(endCoords);
    if (mode === 'DELETE') {
      for (let i = 0; i < startCoords.length; i++) {
        if (!endCoords.includes(startCoords[i])) {
          meta.splice(i, 1);
        }
      }
      return meta;
    } else if (mode === 'ADD') {
      for (let i = 0; i < endCoords.length; i++) {
        if (startCoords[i] !== endCoords[i]) {
          meta.splice(i, 0, { name: '' });
          break;
        }
      }
      return meta;
    } else {
      return meta;
    }
  }

  // ****** MAP control functions *******

  // handle map zoom controls
  public zoomMap(zoomIn: boolean) {
    if (zoomIn) {
      if (this.app.config.map.zoomLevel < this.app.MAP_ZOOM_EXTENT.max) {
        ++this.app.config.map.zoomLevel;
      }
    } else {
      if (this.app.config.map.zoomLevel > this.app.MAP_ZOOM_EXTENT.min) {
        --this.app.config.map.zoomLevel;
      }
    }
  }

  // orient map heading up / north up
  public rotateMap() {
    if (this.fbMap.northUp) {
      this.fbMap.rotation = 0;
    } else {
      this.fbMap.rotation = 0 - this.dfeat.active.orientation;
    }
  }

  // center map to active vessel position
  public centerVessel() {
    const t = this.dfeat.active.position;
    t[0] += 0.0000000000001;
    this.fbMap.center = t;
  }

  public drawVesselLines(vesselUpdate = false) {
    const z = this.fbMap.zoomLevel;
    const offset = z < 29 ? this.zoomOffsetLevel[Math.floor(z)] : 60;
    const wMax = 10; // max line length

    const vl = {
      trail: [],
      xtePath: [],
      bearing: [],
      anchor: [],
      cpa: [],
      heading: [],
      awa: [],
      twd: [],
      cog: [],
      laylines: { port: [], starboard: [] },
      targetAngle: []
    };

    // vessel trail
    if (this.app.data.trail) {
      vl.trail = [].concat(this.app.data.trail);
      if (vesselUpdate) {
        vl.trail.push(this.dfeat.active.position);
      }
    }

    // anchor line (active)
    if (!this.app.data.anchor.raised) {
      vl.anchor = [this.app.data.anchor.position, this.dfeat.active.position];
    }

    // CPA line
    vl.cpa = [this.dfeat.closest.position, this.dfeat.self.position];

    // COG line (active)
    vl.cog = this.dfeat.active.vectors.cog ?? [];

    // heading line (active)
    const sog = this.dfeat.active.sog || 0;
    let hl = 0;
    if (this.app.config.selections.vessel.headingLineSize === -1) {
      hl = (sog > wMax ? wMax : sog) * offset;
    } else {
      hl =
        Convert.nauticalMilesToKm(
          this.app.config.selections.vessel.headingLineSize
        ) * 1000;
    }
    vl.heading = [
      this.dfeat.active.position,
      GeoUtils.destCoordinate(
        this.dfeat.active.position,
        this.dfeat.active.orientation,
        hl
      )
    ];

    // bearing line (active)
    const bpos =
      this.dfeat.navData.position &&
      typeof this.dfeat.navData.position[0] === 'number'
        ? this.dfeat.navData.position
        : this.dfeat.active.position;
    vl.bearing = [this.dfeat.active.position, bpos];

    // xtePath
    if (
      this.dfeat.navData.startPosition &&
      typeof this.dfeat.navData.startPosition[0] === 'number' &&
      this.dfeat.navData.position &&
      typeof this.dfeat.navData.position[0] === 'number'
    ) {
      vl.xtePath = [
        this.dfeat.navData.startPosition,
        this.dfeat.navData.position
      ];
    } else {
      vl.xtePath;
    }

    // laylines (active)
    if (
      this.app.config.selections.vessel.laylines &&
      Array.isArray(this.dfeat.navData.position) &&
      typeof this.dfeat.navData.position[0] === 'number' &&
      typeof this.app.data.vessels.active.heading === 'number'
    ) {
      const twd_deg = Convert.radiansToDegrees(
        this.app.data.vessels.self.wind.direction ?? 0
      );

      const twd_inv = Angle.add(twd_deg, 180);

      const destUpwind =
        Math.abs(
          Angle.difference(this.app.data.navData.bearing.value, twd_deg)
        ) < 90;

      const ba_deg = Convert.radiansToDegrees(
        this.app.data.vessels.self.performance.beatAngle ?? Math.PI / 4
      );

      let ga_deg: number;
      let ga_diff: number;
      if (
        typeof this.app.data.vessels.self.performance.gybeAngle === 'number'
      ) {
        ga_deg = Convert.radiansToDegrees(
          this.app.data.vessels.self.performance.gybeAngle
        );
        ga_diff = Math.abs(180 - ga_deg);
      }

      const destInTarget = destUpwind
        ? Math.abs(
            Angle.difference(this.app.data.navData.bearing.value, twd_deg)
          ) < ba_deg
        : Math.abs(
            Angle.difference(this.app.data.navData.bearing.value, twd_inv)
          ) < (ga_diff ?? 0);

      const dtg =
        this.app.config.units.distance === 'm'
          ? this.app.data.navData.dtg * 1000
          : Convert.nauticalMilesToKm(this.app.data.navData.dtg * 1000);

      // mark laylines
      let markLines = [];
      if (destUpwind) {
        const bapt1 = computeDestinationPoint(
          this.dfeat.navData.position,
          dtg,
          Angle.add(twd_inv, ba_deg)
        );
        const bapt2 = computeDestinationPoint(
          this.dfeat.navData.position,
          dtg,
          Angle.add(twd_inv, 0 - ba_deg)
        );

        markLines = [
          [bapt1.longitude, bapt1.latitude],
          this.dfeat.navData.position,
          [bapt2.longitude, bapt2.latitude]
        ];
      } else if (typeof ga_deg === 'number') {
        const gapt1 = computeDestinationPoint(
          this.dfeat.navData.position,
          dtg,
          Angle.add(twd_inv, ga_deg)
        );
        const gapt2 = computeDestinationPoint(
          this.dfeat.navData.position,
          dtg,
          Angle.add(twd_inv, 0 - ga_deg)
        );

        markLines = [
          [gapt1.longitude, gapt1.latitude],
          this.dfeat.navData.position,
          [gapt2.longitude, gapt2.latitude]
        ];
      }

      vl.targetAngle = markLines;

      // vessel laylines
      if (destInTarget) {
        const hbd_deg = Angle.difference(
          twd_deg,
          this.app.data.navData.bearing.value
        );
        // Vector lengths
        let b: number;
        let c: number;
        // intersection points
        let ipts: SKPosition;
        let iptp: SKPosition;

        if (destUpwind) {
          // Vector angles
          const C_RAD = Convert.degreesToRadians(ba_deg - hbd_deg);
          const B_RAD = Convert.degreesToRadians(ba_deg + hbd_deg);
          const A_RAD = Math.PI - (B_RAD + C_RAD);
          b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
          c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
          // intersection points
          ipts = computeDestinationPoint(
            this.app.data.vessels.active.position,
            b,
            Angle.add(twd_deg, ba_deg)
          );
          iptp = computeDestinationPoint(
            this.app.data.vessels.active.position,
            c,
            Angle.add(twd_deg, 0 - ba_deg)
          );
        } else {
          // downwind
          if (markLines.length !== 0 && typeof ga_diff === 'number') {
            // Vector angles
            const C_RAD = Convert.degreesToRadians(ga_diff - hbd_deg);
            const B_RAD = Convert.degreesToRadians(ga_diff + hbd_deg);
            const A_RAD = Math.PI - (B_RAD + C_RAD);
            b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
            c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
            // intersection points
            ipts = computeDestinationPoint(
              this.app.data.vessels.active.position,
              b,
              Angle.add(twd_deg, ga_diff)
            );
            iptp = computeDestinationPoint(
              this.app.data.vessels.active.position,
              c,
              Angle.add(twd_deg, 0 - ga_diff)
            );
          }
        }
        vl.laylines = {
          port: [
            [
              [iptp.longitude, iptp.latitude],
              this.app.data.vessels.active.position
            ],
            [
              [ipts.longitude, ipts.latitude],
              this.app.data.vessels.active.position
            ]
          ],
          starboard: [
            [[ipts.longitude, ipts.latitude], markLines[1]],
            [markLines[1], [iptp.longitude, iptp.latitude]]
          ]
        };
      }
    }

    // AWA (focused)
    let aws = this.dfeat.active.wind.aws || 0;
    if (aws > wMax) {
      aws = wMax;
    }

    vl.awa = [
      this.dfeat.active.position,
      GeoUtils.destCoordinate(
        this.dfeat.active.position,
        this.dfeat.active.wind.awa + this.dfeat.active.orientation,
        typeof this.dfeat.active.orientation === 'number' ? aws * offset : 0
      )
    ];

    // TWD (focused)
    let tws = this.dfeat.active.wind.tws || 0;
    if (tws > wMax) {
      tws = wMax;
    }
    vl.twd = [
      this.dfeat.active.position,
      GeoUtils.destCoordinate(
        this.dfeat.active.position,
        this.dfeat.active.wind.direction || 0,
        typeof this.dfeat.active.orientation === 'number' ? tws * offset : 0
      )
    ];

    this.vesselLines = vl;
  }

  // ******** OVERLAY ACTIONS ************

  public popoverClosed() {
    this.overlay.show = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public formatPopover(id: string, coord: Position, list?: Map<string, any>) {
    if (!id) {
      this.overlay.show = false;
      return;
    }

    this.overlay.content = [];
    this.overlay.id = null;
    this.overlay.type = null;
    this.overlay.featureCount = this.draw.features.getLength();
    this.overlay.position = coord;
    this.overlay.isSelf = false;
    let item = null;
    const t = id.split('.');
    let aid: string;

    switch (t[0]) {
      case 'list':
        this.overlay.type = 'list';
        this.overlay.title = 'Features';
        this.overlay.content = [];
        list.forEach((f) => this.overlay.content.push(f));
        this.overlay.show = true;
        return;
      case 'alarm':
        this.overlay.type = 'alarm';
        aid = id.split('.')[1];
        if (!this.app.data.alarms.has(aid)) {
          return false;
        }
        this.overlay.id = aid;
        this.overlay['alarm'] = this.app.data.alarms.get(aid);
        this.overlay.show = true;
        return;
      case 'anchor':
        this.startModify('anchor');
        return;
      case 'vessels':
        this.overlay.type = 'ais';
        this.overlay.isSelf = true;
        this.overlay['vessel'] = this.dfeat.self;
        this.overlay.show = true;
        return;
      case 'ais-vessels':
        this.overlay.type = 'ais';
        aid = id.slice(4);
        if (!this.dfeat.ais.has(aid)) {
          return false;
        }
        this.overlay.id = aid;
        this.overlay.vessel = this.dfeat.ais.get(aid);
        this.overlay.show = true;
        return;
      case 'atons':
      case 'aton':
      case 'shore':
        this.overlay.type = 'aton';
        if (!this.app.data.atons.has(id)) {
          return false;
        }
        this.overlay.id = id;
        this.overlay.aton = this.app.data.atons.get(id);
        this.overlay.show = true;
        return;
      case 'sar':
        this.overlay.type = 'aton';
        if (!this.app.data.sar.has(id)) {
          return false;
        }
        this.overlay.id = id;
        this.overlay.aton = this.app.data.sar.get(id);
        this.overlay.show = true;
        return;
      case 'meteo':
        this.overlay.type = 'meteo';
        if (!this.app.data.meteo.has(id)) {
          return false;
        }
        this.overlay.id = id;
        this.overlay.aton = this.app.data.meteo.get(id);
        this.overlay.show = true;
        return;
      case 'aircraft':
        this.overlay.type = 'aircraft';
        if (!this.app.data.aircraft.has(id)) {
          return false;
        }
        this.overlay.id = id;
        this.overlay.aircraft = this.app.data.aircraft.get(id);
        this.overlay.show = true;
        return;
      case 'region':
        item = [this.skres.fromCache('regions', t[1])];
        if (!item) {
          return false;
        }
        this.overlay.id = t[1];
        this.overlay.type = 'region';
        this.overlay.title = 'Region';
        this.overlay.resource = item[0];
        this.overlay.show = true;
        return;
      case 'note':
        item = [this.skres.fromCache('notes', t[1])];
        if (!item) {
          return false;
        }
        this.overlay.id = t[1];
        this.overlay.type = 'note';
        this.overlay.title = 'Note';
        this.overlay.resource = item[0];
        this.overlay.show = true;
        return;
      case 'route':
        if (t[1] === 'n2k') {
          item = [this.app.data.n2kRoute];
        } else {
          item = [this.skres.fromCache('routes', t[1])];
        }
        if (!item) {
          return false;
        }
        this.overlay.id = t[1];
        this.overlay.type = 'route';
        this.overlay.title = 'Route';
        this.overlay.resource = item[0];
        this.overlay.show = true;
        return;
      case 'waypoint':
        item = [this.skres.fromCache('waypoints', t[1])];
        if (!item) {
          return false;
        }
        this.overlay.id = t[1];
        this.overlay.type = 'waypoint';
        this.overlay.resource = item[0];
        this.overlay.title = 'Waypoint';
        this.overlay.show = true;
        return;
      case 'dest':
        this.overlay.id = id;
        this.overlay.type = 'destination';
        this.overlay.resource = this.skres.buildWaypoint(coord);
        this.overlay.title =
          this.app.data.navData.destPointName ?? 'Destination';
        this.overlay.show = true;
        return;
      case 'rset':
        this.overlay.id = id;
        this.overlay.type = 'rset';
        this.overlay.resource = this.skres.resSetFromCache(id, true);
        this.overlay.title =
          (this.overlay.resource as GeoJsonFeature).properties.name ??
          'Resource Set';
        this.overlay.show = true;
        return;
    }
  }

  // ** handle selection from the FeatureList popover */
  public featureListSelection(feature) {
    // trim the draw.features collection to the selected feature.id
    const sf = new Collection();
    this.draw.features.forEach((e) => {
      if (e.getId() === feature.id) {
        sf.push(e);
      }
    });
    this.draw.features = sf;
    this.formatPopover(feature.id, feature.coord);
  }

  // ** delete selected feature **
  public deleteFeature(id: string, type: string) {
    switch (type) {
      case 'waypoint':
        this.skres.showWaypointDelete({ id: id });
        break;
      case 'route':
        this.skres.showRouteDelete({ id: id });
        break;
      case 'note':
        this.skres.showNoteDelete({ id: id });
        break;
      case 'region':
        this.skres.showRegionDelete({ id: id });
        break;
    }
  }

  // ** activate route / waypoint
  public setActiveFeature() {
    if (this.overlay.type === 'waypoint') {
      this.skres.navigateToWaypoint({ id: this.overlay.id });
    } else {
      this.activate.emit(this.overlay.id);
    }
  }

  // ** deactivate route / waypoint
  public clearActiveFeature() {
    this.deactivate.emit(this.overlay.id);
  }

  // ** emit info event **
  public itemInfo(id: string, type: string, isSelf = false) {
    if (type === 'ais' && isSelf) {
      this.info.emit({ id: id, type: 'self' });
    } else {
      this.info.emit({ id: id, type: type });
    }
  }

  public setActiveVessel(id: string = null) {
    this.focusVessel.emit(id);
  }

  // ******** DRAW / EDIT / MEASURE ************

  // ** Change Interaction mode **
  private interactionMode(mode: INTERACTION_MODE, value) {
    if (mode === INTERACTION_MODE.MEASURE) {
      if (value === this.measure.enabled) {
        return;
      } else {
        this.measure.coords = [];
        this.measure.totalDistance = 0;
        this.measure.enabled = value;
        this.overlay.show = false;
      }
    } else if (mode === INTERACTION_MODE.DRAW) {
      this.overlay.show = false;
      if (!value) {
        // end draw mode
        if (this.draw.enabled) {
          this.drawEnd.emit({ mode: 'ended' });
        }
        this.draw.enabled = false;
        this.draw.features = null;
        this.draw.style = drawStyles.default;
      } else if (value && this.draw.enabled) {
        return;
      } else {
        // enter draw mode
        this.draw.mode = value;
        this.draw.enabled = true;
        this.draw.features = null;
        this.draw.coordinates = null;
        switch (value) {
          case 'waypoint':
          case 'note':
            this.draw.type = 'Point';
            break;
          case 'route':
            this.draw.type = 'LineString';
            this.draw.style = drawStyles.route;
            break;
          case 'region':
            this.draw.type = 'Polygon';
            this.draw.style = drawStyles.region;
            break;
          default:
            this.draw.type = 'Point';
        }
        this.draw.forSave = null;
        this.draw.properties = {};
        this.draw.modify = false;
      }
    } else if (mode === INTERACTION_MODE.MODIFY) {
      if (!value) {
        // end modify mode
        this.draw.modify = false;
        this.draw.features = null;
      } else if (value && this.draw.modify) {
        return;
      } else {
        // enter modify mode
        this.startModify();
      }
    }
  }

  // ** Enter modify mode **
  public startModify(type?: string) {
    if (this.draw.features.getLength() === 0) {
      return;
    }
    this.draw.type = null;
    this.draw.mode = null;
    this.draw.forSave = null;
    this.draw.coordinates = null;
    this.draw.properties = {};
    this.draw.enabled = false;
    this.draw.modify = true;
    this.modifyStart.emit({ id: this.overlay.id, type: type });
  }

  // ********************************************************

  // Returns distance from last point
  private measureDistanceToAdd(pt?: Position) {
    if (pt && this.measure.coords.length > 0) {
      // return distance between last point in array and pt
      return GeoUtils.distanceTo(
        this.measure.coords[this.measure.coords.length - 1],
        pt
      );
    }
    if (this.measure.coords.length > 1) {
      // return distance between last two points in array
      return GeoUtils.distanceTo(
        this.measure.coords[this.measure.coords.length - 2],
        this.measure.coords[this.measure.coords.length - 1]
      );
    } else {
      return 0;
    }
  }

  private isCoordsArray(ca: Array<Position>) {
    if (Array.isArray(ca)) {
      return Array.isArray(ca[0]) && typeof ca[0][0] === 'number';
    } else {
      return false;
    }
  }

  private transformCoordsArray(ca: Array<Position>) {
    return ca.map((i) => {
      return toLonLat(i);
    });
  }

  // apply default chart style (vectortile)
  applyStyle() {
    return new Style({
      fill: new Fill({
        color: '#e0d10e'
      }),
      stroke: new Stroke({
        color: '#444',
        width: 1
      })
    });
  }

  // ** called by onMapMove() to render features within map extent
  private renderMapContents() {
    if (this.fetchNotes()) {
      this.skres.getNotes();
      this.app.debug(`fetching Notes...`);
    }
  }

  // ** returns true if skres.getNotes() should be called
  private fetchNotes() {
    this.display.layer.notes =
      this.app.config.notes &&
      this.app.config.map.zoomLevel >= this.app.config.selections.notesMinZoom;

    this.app.debug(`lastGet: ${this.app.data.lastGet}`);
    this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);
    if (this.fbMap.zoomLevel < this.app.config.selections.notesMinZoom) {
      return false;
    }
    if (!this.app.data.lastGet) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    }
    // ** calc distance from new map center to lastGet
    const d = GeoUtils.distanceTo(
      this.app.data.lastGet,
      this.app.config.map.center
    );
    this.app.debug(`distance map moved: ${d}`);
    // ** if d is more than half the getRadius
    const cr =
      this.app.config.units.distance === 'ft'
        ? Convert.nauticalMilesToKm(this.app.config.resources.notes.getRadius) *
          1000
        : this.app.config.resources.notes.getRadius * 1000;

    if (d >= cr / 2) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    }
    return false;
  }
}
