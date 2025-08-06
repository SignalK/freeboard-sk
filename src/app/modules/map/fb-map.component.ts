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
  ChartListPopoverComponent,
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
import { LineString, Position } from 'src/app/types';

import { AppFacade } from 'src/app/app.facade';
import { SettingsEventMessage } from 'src/app/lib/services';
import {
  SKResourceService,
  SKOtherResources,
  SKChart,
  SKWaypoint,
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo,
  SKStreamFacade,
  AnchorFacade,
  NotificationManager,
  CourseService
} from 'src/app/modules';
import {
  mapInteractions,
  mapControls,
  basestationStyles,
  aircraftStyles,
  sarStyles,
  regionStyles,
  routeStyles,
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
import { S57Service } from './ol/lib/s57.service';
import { Position as SKPosition } from '@signalk/server-api';
import { FBMapEvent, FBPointerEvent } from './ol/lib/map.component';
import { FeatureLike } from 'ol/Feature';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FBMapInteractService,
  DrawFeatureInfo,
  IOverlay
} from './fbmap-interact.service';

interface IResource {
  id: string;
  type: string;
}

interface IFeatureData {
  aircraft: Map<string, SKAircraft>;
  atons: Map<string, SKAtoN>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
  tracks: Array<Position[]>; // self track(s) from server
  trail: Array<Position>; // self trail (appended to tracks)
  self: SKVessel; //self vessel
  ais: Map<string, SKVessel>; // other vessels
  active: SKVessel; // focussed vessel
  navData: { position: Position; startPosition: Position };
  closest: Array<LineString>;
}

enum INTERACTION_MODE {
  MEASURE,
  DRAW,
  MODIFY
}

@Component({
  selector: 'fb-map',
  imports: [
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
    ChartListPopoverComponent,
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
  @Input() setFocus: string;
  @Input() mapCenter: Position = [0, 0];
  @Input() mapZoom = 1;
  @Input() movingMap = false;
  @Input() northUp = true;
  @Input() measureMode: boolean;
  @Input() drawMode: boolean;
  @Input() modifyMode = false;
  @Input() activeRoute: string;
  @Input() vesselTrail: Array<Position> = [];
  @Input() dblClickZoom = false;
  @Output() drawEnded: EventEmitter<DrawFeatureInfo> = new EventEmitter();
  @Output() activate: EventEmitter<string> = new EventEmitter();
  @Output() deactivate: EventEmitter<string> = new EventEmitter();
  @Output() info: EventEmitter<IResource> = new EventEmitter();
  @Output() exitMovingMap: EventEmitter<boolean> = new EventEmitter();
  @Output() focusVessel: EventEmitter<string> = new EventEmitter();
  @Output() menuItemSelected: EventEmitter<string> = new EventEmitter();

  @ViewChild(MatMenuTrigger, { static: true }) contextMenu: MatMenuTrigger;

  protected vesselLines = {
    twd: [],
    awa: [],
    bearing: [],
    heading: [],
    anchor: [],
    trail: [],
    xtePath: [],
    laylines: { port: [], starboard: [] },
    targetAngle: []
  };

  protected overlay: IOverlay = {
    id: null,
    type: null,
    icon: null,
    position: [0, 0],
    show: false,
    title: '',
    content: null,
    featureCount: 0,
    readOnly: false
  };

  private zoomOffsetLevel = [
    1, 1000000, 550000, 290000, 140000, 70000, 38000, 17000, 7600, 3900, 1900,
    950, 470, 250, 120, 60, 30, 15.5, 8.1, 4, 2, 1, 0.5, 0.25, 0.12, 0.06, 0.03,
    0.015, 0.008, 1
  ];

  // ** map ctrl **
  protected fbMap = {
    rotation: 0,
    center: [0, 0],
    zoomLevel: 1,
    extent: null,
    interactions: mapInteractions,
    controls: mapControls
  };

  // ** map feature styles
  protected featureStyles = {
    route: routeStyles,
    region: regionStyles,
    anchor: anchorStyles,
    alarm: alarmStyles,
    destination: destinationStyles,
    basestation: basestationStyles,
    aircraft: aircraftStyles,
    sar: sarStyles,
    layline: laylineStyles,
    targetAngle: targetAngleStyle,
    raceCourse: raceCourseStyles
  };

  // ** map feature data
  protected dfeat: IFeatureData = {
    aircraft: new Map(),
    atons: new Map(),
    sar: new Map(),
    meteo: new Map(),
    tracks: [], // self track(s) from server
    trail: [], // self trail (appended to tracks)
    self: new SKVessel(), //self vessel
    ais: new Map(), // other vessels
    active: new SKVessel(), // focussed vessel
    navData: { position: null, startPosition: null },
    closest: []
  };

  // ** AIS target management
  protected aisMgr = {
    updateList: [],
    staleList: [],
    removeList: []
  };

  // ** map layer display
  protected display = {
    layer: {
      notes: false,
      wind: false,
      colormap: false,
      heatmap: false
    }
  };
  private saveTimer;
  private isDirty = false;

  protected mouse = {
    pixel: null,
    coords: [0, 0],
    xy: null
  };
  contextMenuPosition = { x: '0px', y: '0px' };

  private obsList = [];

  constructor(
    protected app: AppFacade,
    protected s57Service: S57Service,
    protected skres: SKResourceService,
    protected skresOther: SKOtherResources,
    protected skstream: SKStreamFacade,
    protected anchor: AnchorFacade,
    protected notiMgr: NotificationManager,
    private course: CourseService,
    protected mapInteract: FBMapInteractService
  ) {}

  ngAfterViewInit() {
    // ** trigger map focus **
    setTimeout(() => {
      this.setFocus = 'xxx';
    }, 500);
  }

  ngOnInit() {
    // STREAM VESSELS update event
    this.obsList.push(
      this.skstream.vessels$().subscribe(() => this.onVessels())
    );
    // STREAM VESSEL TRAIL update event
    this.obsList.push(
      this.skstream.trail$().subscribe((value) => this.onResourceUpdate(value))
    );
    // SETTINGS event (Save)
    this.obsList.push(
      this.app.settings$.subscribe((r: SettingsEventMessage) => {
        if (r.action === 'save') {
          this.s57Service.SetOptions(this.app.config.selections.s57Options);
          this.renderMapContents(r.options?.fetchNotes);
          if (!this.app.config.selections.trailFromServer) {
            this.dfeat.trail = [];
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this.stopSaveTimer();
    this.obsList.forEach((i) => i.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.vesselTrail) {
      this.drawVesselLines();
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
      this.renderMapContents(true);
    }
    if (changes && changes.movingMap && !changes.movingMap.firstChange) {
      if (changes.movingMap.currentValue) {
        this.startSaveTimer();
      } else {
        this.stopSaveTimer();
      }
      this.centerVessel();
    }
    if (changes && changes.northUp) {
      this.rotateMap();
    }
    if (changes && changes.measureMode) {
      this.applyInteractionMode(
        INTERACTION_MODE.MEASURE,
        changes.measureMode.currentValue
      );
    }
    if (changes && changes.drawMode) {
      this.applyInteractionMode(
        INTERACTION_MODE.DRAW,
        changes.drawMode.currentValue
      );
    }
    if (changes && changes.modifyMode && !changes.modifyMode.firstChange) {
      this.applyInteractionMode(
        INTERACTION_MODE.MODIFY,
        changes.modifyMode.currentValue
      );
    }
    if (changes && changes.dblClickZoom) {
      this.toggleDblClickZoom(changes.dblClickZoom.currentValue);
    }
  }

  // format WMS parameters
  protected wmsParams(chart: SKChart) {
    return {
      LAYERS: chart.layers ? chart.layers.join(',') : ''
    };
  }

  // ** periodically persist state (used in movingMap mode)
  private startSaveTimer() {
    if (!this.saveTimer) {
      this.saveTimer = setInterval(() => {
        if (this.isDirty) {
          this.app.saveConfig({ suppressTrailFetch: true });
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
    // calculate CPA lines
    const parseClosest = () => {
      const v = [];
      if (this.app.data.vessels.self.position) {
        this.app.data.vessels.closest.forEach((id: string) => {
          if (this.app.data.vessels.aisTargets.has(id)) {
            const a = this.app.data.vessels.aisTargets.get(id);
            v.push([a.position, this.app.data.vessels.self.position]);
          }
        });
      }
      return v;
    };

    this.dfeat.closest = parseClosest();
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
    if (this.movingMap) {
      this.centerVessel();
    }
  }

  private onResourceUpdate(value) {
    this.app.debug(value);
    if (value.action === 'get' || value.action === 'selected') {
      if (value.mode === 'route') {
        /** @todo remediate n2kRoute */
        if (this.app.data.n2kRoute) {
          //this.dfeat.routes.push(this.app.data.n2kRoute);
        }
      }
      if (value.mode === 'trail') {
        // vessel trail
        if (this.app.config.selections.trailFromServer) {
          this.dfeat.trail = value.data;
        }
      }
    }
  }

  // ********** MAP EVENT HANDLERS *****************

  protected toggleDblClickZoom(set?: boolean) {
    if (set) {
      this.fbMap.interactions = [{ name: 'doubleclickzoom' }].concat(
        mapInteractions
      );
    } else {
      this.fbMap.interactions = [].concat(mapInteractions);
    }
  }

  // ** handle context menu choices **
  protected onContextMenuAction(action: string, pos: Position) {
    switch (action) {
      case 'add_wpt':
        this.skres.newWaypointAt(pos);
        break;
      case 'add_note':
        this.skres.showNoteEditor({ position: pos });
        break;
      case 'nav_to':
        this.app.data.activeWaypoint = null;
        this.app.data.navData.pointNames = [];
        this.course.setDestination({
          latitude: pos[1],
          longitude: pos[0]
        });
        break;
      case 'measure':
        this.mapInteract.startMeasuring();
        break;
      default:
        this.menuItemSelected.emit(action);
        break;
    }
  }

  // handle map move / zoom
  protected onMapMoveEnd(e: FBMapEvent) {
    this.app.config.map.zoomLevel = e.zoom;

    this.fbMap.extent = e.extent;
    this.app.config.map.center = e.lonlat as Position;

    this.drawVesselLines();
    if (!this.movingMap) {
      this.app.saveConfig({ suppressTrailFetch: true });
      this.isDirty = false;
    } else {
      this.isDirty = true;
    }

    // render map features
    this.renderMapContents(e.zoomChanged);
  }

  // pointer events
  protected onMapPointerMove(e: FBPointerEvent) {
    this.mouse.pixel = e.pixel;
    this.mouse.xy = e.coordinate;
    this.mouse.coords = GeoUtils.normaliseCoords(e.lonlat as Position);
    if (
      this.mapInteract.isMeasuring() &&
      this.mapInteract.measurement().coords.length !== 0
    ) {
      const c = e.lonlat;
      this.overlay.position = c;
      const lm = this.mapInteract.distanceFromLastPoint(c as Position);
      const b = getGreatCircleBearing(
        this.mapInteract.measurement().coords.slice(-1)[0],
        c as Position
      );
      this.overlay.title =
        this.app.formatValueForDisplay(lm, 'm') +
        ' ' +
        this.app.formatValueForDisplay(b, 'deg');
    }
  }

  protected onMapPointerDrag() {
    if (!this.app.config.map.lockMoveMap && this.app.uiConfig().mapMove) {
      this.exitMovingMap.emit(true);
    }
  }

  protected onMapPointerDown(e: FBPointerEvent) {
    this.mouse.coords = GeoUtils.normaliseCoords(e.lonlat as Position);
    this.contextMenuPosition.x = (e as any).clientX + 'px';
    this.contextMenuPosition.y = (e as any).clientY + 'px';
  }

  protected onMapSingleClick(e) {
    this.app.data.map.atClick = {
      features: e.features,
      lonlat: e.lonlat
    };
    if (
      this.mapInteract.isMeasuring() &&
      this.mapInteract.measurement().coords.length !== 0
    ) {
      this.onMeasureClick(e.lonlat);
    } else if (
      this.mapInteract.isDrawing() &&
      this.mapInteract.draw.resourceType === 'route'
    ) {
      this.onDrawClick(e.features);
    } else if (
      !this.mapInteract.isDrawing() &&
      !this.mapInteract.isModifying()
    ) {
      if (!this.app.config.popoverMulti) {
        this.overlay.show = false;
      }
      const flist = new Map();
      const fa = [];
      let maskPopover = false;
      const chartBoundsFeatures = new Map();
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
            chartBoundsFeatures.set(id, {
              id: t[1],
              coord: e.lonlat,
              icon: icon,
              text: feature.get('name')
            });
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
              text = `Alarm: ${feature.get('type')}`;
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
              icon = feature.get('icon');
              addToFeatureList = true;
              const n = this.skres.fromCache('notes', t[1]);
              text = n[1].name ?? '';
              break;
            case 'route':
              icon = 'route'; //'directions';
              addToFeatureList = true;
              /** @todo n2kroute */
              if (t[1] === 'n2k') {
                text = this.app.data.n2kRoute
                  ? this.app.data.n2kRoute[1].name
                  : '';
              } else {
                const r = this.skres.fromCache('routes', t[1]);
                text = r[1].name;
              }
              break;
            case 'waypoint':
              icon = 'location_on';
              addToFeatureList = true;
              const w = this.skres.fromCache('waypoints', t[1]);
              text = w[1].name ?? '';
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
              icon = 'tab_unselected';
              text = feature.get('name');
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
      if (chartBoundsFeatures.size > 0) {
        //show list of features
        this.formatPopover('chartlist.', e.lonlat, chartBoundsFeatures);
        return;
      }
      if (maskPopover) {
        return;
      }
      this.mapInteract.draw.features = new Collection(fa); // features collection for modify interaction
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

  /** handle right click / touch hold */
  protected onMapRightClick(e: { features: FeatureLike[]; lonlat: Position }) {
    this.app.data.map.atClick = e;
    this.app.debug(`onRightClick()`, this.app.data.map.atClick);
    if (
      this.mapInteract.isMeasuring() &&
      this.mapInteract.measurement().coords.length !== 0
    ) {
      this.onMeasureClick(e.lonlat);
    }
  }

  /** handle Map context menu event */
  protected onMapContextMenu(e: PointerEvent) {
    this.app.debug(`onMapContextMenu()`, this.app.data.map.atClick);
    this.onContextMenu(e);
  }

  /** handle ol-map container context menu event */
  protected onContextMenu(e: PointerEvent) {
    this.app.debug(`onContextMenu()`, this.app.data.map.atClick);
    if (this.app.uiCtrl().suppressContextMenu) {
      return;
    }
    e.preventDefault();
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
    this.contextMenu.menuData = { item: this.mouse.coords };
    if (
      this.mapInteract.isMeasuring() &&
      this.mapInteract.measurement().coords.length !== 0
    ) {
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

  /** toggle display of chart feature  */
  protected toggleFeatureSelection(id: string | string[], resType: 'charts') {
    if (resType === 'charts') {
      this.skres.chartSelected(id);
    }
  }

  /** handle OL interaction start event */
  protected onMeasureStart(e: DrawEvent) {
    this.app.debug(`onMeasureStart()...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let c = (e.feature.getGeometry() as any)
      .getCoordinates()
      .map((c: Position) => toLonLat(c));
    c = c.slice(0, c.length - 1);
    this.mapInteract.measurementCoords = c;
    this.formatPopover(null, null);
    this.overlay.position = c;
    this.overlay.title = '0';
    this.overlay.show = true;
    this.overlay.type = 'measure';
  }

  /** process mouse click in MEASURE mode */
  protected onMeasureClick(pt: Position) {
    this.app.debug(`onMeasureClick()...`);
    if (!Array.isArray(pt)) {
      return;
    }
    const lastPt =
      this.mapInteract.measurement().coords[
        this.mapInteract.measurement().coords.length - 1
      ];
    if (pt[0] === lastPt[0] && pt[1] === lastPt[1]) {
      return;
    }
    const lm = this.mapInteract.addMeasurementCoord(pt);
    this.overlay.position = pt;
    // ** update popover measurement values
    const c = this.mapInteract.measurement().coords.slice(-2);
    const b = getGreatCircleBearing(c[0], c[1]) ?? 0;
    this.overlay.title =
      this.app.formatValueForDisplay(lm, 'm') +
      ' ' +
      this.app.formatValueForDisplay(b, 'deg');
  }

  /** handle OL interaction start event */
  protected onMeasureEnd() {
    this.app.debug(`onMeasureEnd()...`);
    this.overlay.show = false;
    this.mapInteract.stopMeasuring();
  }

  /**
   * process mouse click in DRAW mode
   * @param fa Array of Features
   */
  protected onDrawClick(fa: Feature[]) {
    if (!Array.isArray(fa)) {
      return;
    }
    if (this.mapInteract.draw.resourceType === 'route') {
      let rteCoords: Position[];
      fa.forEach((f: Feature) => {
        if (f.getGeometry().getType() === 'LineString') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rteCoords = (f.getGeometry() as any)
            .getCoordinates()
            .map((c: Position) => toLonLat(c));
          rteCoords = rteCoords.slice(0, rteCoords.length - 1);
        }
      });
      this.mapInteract.measurementCoords = rteCoords;
    }
  }

  /** handle OL interaction end event */
  protected onDrawEnd(e: { feature: Feature }) {
    this.mapInteract.stopDrawing(e.feature);
    this.drawEnded.emit(this.mapInteract.draw);
  }

  /** Enter modify mode */
  protected modifyFeature(featureType?: string) {
    if (this.mapInteract.draw.features.getLength() === 0) {
      return;
    }
    this.mapInteract.startModifying(this.overlay);
    if (this.overlay.type === 'route') {
      this.mapInteract.measurementCoords = this.skres.fromCache(
        'routes',
        this.overlay.id
      )[1].feature.geometry.coordinates;
    }
    if (featureType === 'anchor') {
      this.overlay.type = featureType;
    }
  }

  protected onModifyStart(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    this.mapInteract.draw.coordinates = f.getGeometry().getCoordinates();
    if (!this.mapInteract.draw.forSave.id) {
      // initialise save info
      this.mapInteract.draw.forSave.id = f.getId();
    }
    if (f.getGeometry().getType() === 'LineString') {
      const meta = f.get('pointMetadata');
      if (meta) {
        this.mapInteract.draw.forSave.coordsMetadata = meta;
      }
    }
  }

  protected onModifyEnd(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    const fid = f.getId();
    const c = f.getGeometry().getCoordinates();
    if (f.getGeometry().getType() === 'LineString') {
      this.updateCoordsMeta(
        this.mapInteract.draw.coordinates,
        c,
        this.mapInteract.draw.forSave.coordsMetadata
      );
    }
    let pc;
    if (fid.split('.')[0] === 'route') {
      pc = this.transformCoordsArray(c);
      this.mapInteract.measurementCoords = pc;
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
        this.anchor.setAnchorPosition(pc).catch((err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        });
      }
    }
    this.mapInteract.draw.forSave['coords'] = pc;
    if (
      this.app.data.activeRoute &&
      this.mapInteract.draw.forSave.id.indexOf(this.app.data.activeRoute) !== -1
    ) {
      this.app.data.activeRouteIsEditing = true;
    } else {
      this.app.data.activeRouteIsEditing = false;
    }
    this.app.data.editingId = this.mapInteract.draw.forSave.id;
    //this.mapInteract.draw.forSave = e;
    this.app.debug(this.mapInteract.draw.forSave);
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
  protected zoomMap(zoomIn: boolean) {
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
  protected rotateMap() {
    if (this.northUp) {
      this.fbMap.rotation = 0;
    } else {
      this.fbMap.rotation = 0 - this.dfeat.active.orientation;
    }
  }

  // center map to active vessel position
  protected centerVessel() {
    const t = this.dfeat.active.position;
    t[0] += 0.0000000000001;
    this.fbMap.center = t;
  }

  protected drawVesselLines(vesselUpdate = false) {
    const z = this.fbMap.zoomLevel;
    const offset = z < 29 ? this.zoomOffsetLevel[Math.floor(z)] : 60;
    const wMax = 10; // max line length

    const vl = {
      trail: [],
      xtePath: [],
      bearing: [],
      anchor: [],
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
        vl.trail.push(this.dfeat.self.position);
      }
    }

    // anchor line (active)
    if (!this.anchor.raised()) {
      vl.anchor = [this.anchor.position(), this.dfeat.self.position];
    }

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
        ga_diff = 180 - Math.abs(ga_deg);
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

  protected popoverClosed() {
    this.overlay.show = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected formatPopover(
    id: string,
    coord: Position,
    list?: Map<string, any>
  ) {
    if (!id) {
      this.overlay.show = false;
      return;
    }

    this.overlay.content = [];
    this.overlay.id = null;
    this.overlay.type = null;
    this.overlay.featureCount = this.mapInteract.draw.features?.getLength();
    this.overlay.position = coord;
    this.overlay.isSelf = false;
    this.overlay.readOnly = false;
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
      case 'chartlist':
        this.overlay.type = 'chartlist';
        this.overlay.content = [];
        list.forEach((f) => this.overlay.content.push(f));
        this.overlay.show = true;
        return;
      case 'alarm':
        this.overlay.type = 'alarm';
        aid = id.split('.').slice(1).join('.');
        this.overlay['alarm'] = this.notiMgr.getAlert(aid) as any;
        if (!this.overlay['alarm']) {
          return false;
        }
        this.overlay.id = aid;
        this.overlay.show = true;
        return;
      case 'anchor':
        this.modifyFeature('anchor');
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
        this.overlay.readOnly =
          this.overlay.resource[1]?.feature?.properties?.readOnly ?? false;
        return;
      case 'note':
        item = this.skres.fromCache('notes', t[1]);
        if (!item) {
          return false;
        }
        this.overlay.readOnly = item[1]?.properties?.readOnly ?? false;
        if (this.overlay.readOnly) {
          this.overlay.show = false;
          this.skres.showNoteDetails(item[0]);
        } else {
          this.overlay.id = t[1];
          this.overlay.type = 'note';
          this.overlay.title = 'Note';
          this.overlay.resource = item;
          this.overlay.show = true;
        }
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
        this.overlay.readOnly =
          this.overlay.resource[1]?.feature?.properties?.readOnly ?? false;
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
        this.overlay.readOnly =
          this.overlay.resource[1]?.feature?.properties?.readOnly ?? false;
        return;
      case 'dest':
        this.overlay.id = id;
        this.overlay.type = 'destination';
        this.overlay.resource = this.skres.buildWaypoint(coord) as [
          string,
          SKWaypoint
        ];
        this.overlay.title =
          this.app.data.navData.destPointName ?? 'Destination';
        this.overlay.show = true;
        return;
      case 'rset':
        this.overlay.id = id;
        this.overlay.type = 'rset';
        this.overlay.resource = this.skresOther.fromCache(id, true);
        this.overlay.title =
          (this.overlay.resource as GeoJsonFeature).properties.name ??
          'Resource Set';
        this.overlay.show = true;
        return;
    }
  }

  // ** handle selection from the FeatureList popover */
  protected featureListSelection(feature) {
    // trim the draw.features collection to the selected feature.id
    const sf = new Collection();
    this.mapInteract.draw.features.forEach((e) => {
      if (e.getId() === feature.id) {
        sf.push(e);
      }
    });
    this.mapInteract.draw.features = sf;
    this.formatPopover(feature.id, feature.coord);
  }

  // ** delete selected feature **
  protected deleteFeature(id: string, type: string) {
    switch (type) {
      case 'waypoint':
        this.skres.deleteWaypoint(id);
        break;
      case 'route':
        this.skres.deleteRoute(id);
        break;
      case 'note':
        this.skres.deleteNote(id);
        break;
      case 'region':
        this.skres.deleteRegion(id);
        break;
    }
  }

  // ** activate route / waypoint
  protected setActiveFeature() {
    if (this.overlay.type === 'waypoint') {
      this.course.navigateToWaypoint(this.overlay.id);
    } else {
      this.activate.emit(this.overlay.id);
    }
  }

  // ** deactivate route / waypoint
  protected clearActiveFeature() {
    this.deactivate.emit(this.overlay.id);
  }

  // ** emit info event **
  protected itemInfo(id: string, type: string, isSelf = false) {
    if (type === 'ais' && isSelf) {
      this.info.emit({ id: id, type: 'self' });
    } else {
      this.info.emit({ id: id, type: type });
    }
  }

  protected setActiveVessel(id: string = null) {
    this.focusVessel.emit(id);
  }

  // ******** Interactions: DRAW / EDIT / MEASURE ************

  /** Apply the selected Interaction mode */
  private applyInteractionMode(mode: INTERACTION_MODE, value: boolean) {
    this.overlay.show = false;
    if (mode === INTERACTION_MODE.MEASURE) {
      this.mapInteract.draw.style = value
        ? drawStyles.measure
        : drawStyles.default;
    }
    if (mode === INTERACTION_MODE.DRAW) {
      this.mapInteract.draw.style =
        this.mapInteract.draw.resourceType === 'route'
          ? drawStyles.route
          : this.mapInteract.draw.resourceType === 'region'
          ? drawStyles.region
          : drawStyles.default;
    }
  }

  // ********************************************************

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

  // ** called by onMapMoveEnd() to render features within map extent
  private renderMapContents(zoomChanged?: boolean) {
    if (this.shouldFetchNotes(zoomChanged)) {
      this.skres.refreshNotes();
      this.app.debug(`fetching Notes...`);
    }
    if (this.shouldFetchResourceSets(zoomChanged)) {
      this.app.debug(`fetching ResourceSets...`);
      this.skresOther.refreshInBoundsItems();
    }
  }

  // returns true when map center has moved a distance > (threshold / 2)
  private mapMoveThresholdExceeded(threshold: number): boolean {
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
        ? Convert.nauticalMilesToKm(threshold) * 1000
        : threshold * 1000;

    this.app.debug(`mapMoveThresholdExceeded: ${d >= cr / 2}`);
    if (d >= cr / 2) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    } else {
      return false;
    }
  }

  // ** returns true if skresOther.refreshInBoundsItems() should be called
  private shouldFetchResourceSets(zoomChanged: boolean) {
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      if (!this.skresOther.anySelected()) {
        return false;
      }
      if (zoomChanged) {
        return true;
      }
      return this.mapMoveThresholdExceeded(50);
    } else {
      return false;
    }
  }

  // ** returns true if skres.refreshNotes() should be called
  private shouldFetchNotes(zoomChanged: boolean) {
    this.display.layer.notes =
      this.app.config.notes &&
      this.app.config.map.zoomLevel >= this.app.config.selections.notesMinZoom;

    this.app.debug(`lastGet: ${this.app.data.lastGet}`);
    this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);

    if (zoomChanged) {
      if (this.fbMap.zoomLevel < this.app.config.selections.notesMinZoom) {
        return false;
      } else {
        return true;
      }
    }
    return this.mapMoveThresholdExceeded(
      this.app.config.resources.notes.getRadius
    );
  }
}
