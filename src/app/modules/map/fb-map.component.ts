import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges,
  signal,
  input,
  effect,
  inject
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

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
import { CoordsPipe } from 'src/app/lib/pipes';

import { computeDestinationPoint, getGreatCircleBearing } from 'geolib';
import { toLonLat } from 'ol/proj';
import { Style, Stroke, Fill } from 'ol/style';
import { Collection, Feature } from 'ol';
import { Feature as GeoJsonFeature } from 'geojson';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils, Angle } from 'src/app/lib/geoutils';
import { LineString, MultiLineString, Position } from 'src/app/types';

import { AppFacade } from 'src/app/app.facade';

import {
  SKResourceService,
  FBCustomResourceService,
  SKChart,
  SKWaypoint,
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo,
  SKStreamFacade,
  AnchorService,
  NotificationManager,
  CourseService,
  SettingsFacade,
  WeatherForecastModal,
  FeaturePropertiesModal
} from 'src/app/modules';
import {
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
  raceCourseStyles,
  bearingDistanceStyle
} from './mapconfig';
import { ModifyEvent } from 'ol/interaction/Modify';
import { DrawEvent } from 'ol/interaction/Draw';
import { Coordinate } from 'ol/coordinate';
import { SKPosition } from 'src/app/types';
import {
  FBMapEvent,
  FBPointerEvent,
  zoomOffsetLevel,
  MapComponent
} from './ol/lib/map.component';
import { FeatureLike } from 'ol/Feature';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FBMapInteractService,
  DrawFeatureInfo,
  IPopover
} from './fbmap-interact.service';
import { ScaleLine } from 'ol/control';
import { Units } from 'ol/control/ScaleLine';
import { DragBoxEvent } from 'ol/interaction/DragBox';

interface IResource {
  id: string;
  type: string;
}

interface IFeatureData {
  aircraft: Map<string, SKAircraft>;
  atons: Map<string, SKAtoN>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
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
    CoordsPipe,
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
  @ViewChild('olMap', { static: false }) olMap: MapComponent;

  scaleUnits = input<string>('');

  protected perfLaylines = signal<{
    port: MultiLineString;
    starboard: MultiLineString;
  }>({ port: [], starboard: [] });
  protected perfTargetAngle = signal<LineString>([]);
  protected vesselLines = signal<{
    cog: LineString;
    heading: LineString;
  }>({
    cog: [],
    heading: []
  });

  protected overlay = signal<IPopover>({
    id: null,
    type: null,
    icon: null,
    position: [0, 0],
    show: false,
    title: '',
    content: null,
    featureCount: 0,
    readOnly: false,
    isSelf: false
  });

  protected olMapControls = mapControls;
  protected olMapInteractions = signal<Array<{ name: string }>>([]);
  protected mapZoomLevel = signal<number>(1);
  protected mapCenterPositon = signal<Position>([0, 0]);
  protected mapRotation = signal<number>(0);

  protected showNoteslayer = signal<boolean>(false); //control notes layer display

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
    raceCourse: raceCourseStyles,
    bearingDistance: bearingDistanceStyle
  };

  // ** map feature data
  protected dfeat: IFeatureData = {
    aircraft: new Map(),
    atons: new Map(),
    sar: new Map(),
    meteo: new Map(),
    self: new SKVessel(), //self vessel
    ais: new Map(), // other vessels
    active: new SKVessel(), // focussed vessel
    navData: { position: null, startPosition: null },
    closest: []
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

  private http = inject(HttpClient);
  protected app = inject(AppFacade);
  protected skres = inject(SKResourceService);
  protected skresOther = inject(FBCustomResourceService);
  protected skstream = inject(SKStreamFacade);
  protected anchor = inject(AnchorService);
  protected notiMgr = inject(NotificationManager);
  protected course = inject(CourseService);
  protected mapInteract = inject(FBMapInteractService);
  private settings = inject(SettingsFacade);
  private bottomSheet = inject(MatBottomSheet);

  constructor() {
    effect(() => {
      if (this.scaleUnits()) {
        this.setScaleUnits();
      }
    });
    this.toggleDblClickZoom(); // init olMapinterations
  }

  ngAfterViewInit() {
    this.setScaleUnits();
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
    // SETTINGS settings.change$ event
    this.obsList.push(
      this.settings.change$.subscribe((r: string[]) => {
        this.renderMapContents(r.includes('fetchNotes'));
        if (r.includes(`trailFromServer`)) {
          if (!this.app.config.vessels.trailFromServer) {
            this.app.selfTrailFromServer.update(() => {
              return [];
            });
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
    if (changes && changes.mapCenter && changes.mapCenter.currentValue) {
      this.mapCenterPositon.set(changes.mapCenter.currentValue);
    }
    if (
      changes &&
      changes.mapZoom &&
      typeof changes.mapZoom.currentValue === 'number'
    ) {
      this.mapZoomLevel.set(changes.mapZoom.currentValue);
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

  // set map scale units
  private setScaleUnits() {
    try {
      const u: Units = this.scaleUnits() === 'm' ? 'metric' : 'nautical';
      const c = this.olMap.getMap().getControls().getArray();
      (c[0] as ScaleLine).setUnits(u);
    } catch (err) {
      // no map or scale control
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
          this.app.saveConfig();
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
    this.dfeat.navData.position = this.course.courseData().position;
    this.dfeat.navData.startPosition = this.course.courseData().startPosition;
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

    // ** update vessel on map **
    if (this.dfeat.self.positionReceived) {
      this.app.data.vessels.showSelf = true;
    }
    // ** locate vessel popover
    if (
      this.overlay().show &&
      ['ais', 'aton', 'aircraft'].includes(this.overlay().type)
    ) {
      if (this.overlay().isSelf) {
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: this.dfeat.self.position,
            vessel: this.dfeat.self
          });
        });
      } else {
        if (
          (this.overlay().type === 'ais' &&
            !this.dfeat.ais.has(this.overlay().id)) ||
          (this.overlay().type === 'atons' &&
            !this.dfeat.atons.has(this.overlay().id)) ||
          (this.overlay().type === 'aircraft' &&
            !this.dfeat.aircraft.has(this.overlay().id))
        ) {
          this.overlay().show = false;
        } else {
          if (this.overlay().type === 'ais') {
            this.overlay.update((current) => {
              return Object.assign({}, current, {
                position: this.dfeat.ais.get(current.id).position,
                vessel: this.dfeat.ais.get(current.id)
              });
            });
          }
        }
      }
      if (this.app.mapExtent()[0] < 180 && this.app.mapExtent()[2] > 180) {
        // if dateline is in view adjust overlay position to stay with vessel

        if (
          this.overlay().position[0] < 0 &&
          this.overlay().position[0] > -180
        ) {
          this.overlay.update((current) => {
            return Object.assign({}, current, {
              position: [current.position[0] + 360, current.position[1]]
            });
          });
        }
      }
    }
    this.drawVesselLines(this.app.data.vessels.self.positionReceived);
    this.rotateMap();
    if (this.movingMap) {
      this.centerVessel();
    }
  }

  // ********** MAP EVENT HANDLERS *****************

  private toggleDblClickZoom(set?: boolean) {
    const olInteractions = [
      { name: 'dragpan' },
      { name: 'dragzoom' },
      { name: 'keyboardpan' },
      { name: 'keyboardzoom' },
      { name: 'mousewheelzoom' },
      { name: 'pinchzoom' }
    ];

    this.olMapInteractions.update(() => {
      const i = set
        ? [{ name: 'doubleclickzoom' }].concat(olInteractions)
        : [].concat(olInteractions);
      return i;
    });
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
        this.course.courseData().pointNames = [];
        this.course.setDestination({
          latitude: pos[1],
          longitude: pos[0]
        });
        break;
      case 'bearing_dist':
        this.formatPopover('bearing_dist', pos);
        break;
      case 'weather_forecast':
        this.bottomSheet.open(WeatherForecastModal, {
          disableClose: true,
          data: {
            title: 'Forecast',
            position: pos,
            subTitle: 'Location: Cursor Position'
          }
        });
        break;
      case 'measure':
        this.mapInteract.startMeasuring();
        break;
      case 'get_feature_info':
        this.getFeatureInfo(pos);
        break;
      default:
        this.menuItemSelected.emit(action);
        break;
    }
  }

  // handle map move / zoom
  protected onMapMoveEnd(e: FBMapEvent) {
    this.app.config.map.zoomLevel = e.zoom;

    this.app.mapExtent.update(() => e.extent);
    this.app.config.map.center = e.lonlat as Position;

    this.drawVesselLines();
    if (!this.movingMap) {
      this.app.saveConfig();
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
    if (this.mapInteract.isMeasuring()) {
      if (
        this.mapInteract.measureGeometryType === 'LineString' &&
        this.mapInteract.measurement().coords.length !== 0
      ) {
        const c = e.lonlat;
        const lm = this.mapInteract.distanceFromLastPoint(c as Position);
        const b = getGreatCircleBearing(
          this.mapInteract.measurement().coords.slice(-1)[0],
          c as Position
        );
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: c,
            title: `${this.app.formatValueForDisplay(
              lm,
              'm'
            )} ${this.app.formatValueForDisplay(b, 'deg')}`
          });
        });
      } else if (this.mapInteract.measureGeometryType === 'Circle') {
        const c = e.lonlat;
        const lm = this.mapInteract.distanceFromCenter(c as Position);
        const b = getGreatCircleBearing(
          this.mapInteract.measurement().center ?? (c as Position),
          c as Position
        );
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: c,
            title: `${this.app.formatValueForDisplay(
              lm,
              'm'
            )} ${this.app.formatValueForDisplay(b, 'deg')}`
          });
        });
      }
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
    if (this.mapInteract.isMeasuring()) {
      // measuring
      this.parseClickInMeasureMode(e.lonlat);
    } else if (
      // drawing
      this.mapInteract.isDrawing() &&
      this.mapInteract.draw.resourceType === 'route'
    ) {
      this.onDrawClick(e.features);
    } else if (
      //not interacting
      !this.mapInteract.isDrawing() &&
      !this.mapInteract.isModifying()
    ) {
      if (!this.app.config.map.popoverMulti) {
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            show: false
          });
        });
      }
      this.processMapClick(e);
    }
  }

  /** Handle right click / touch hold */
  protected onMapRightClick(e: { features: FeatureLike[]; lonlat: Position }) {
    this.app.data.map.atClick = e;
    this.app.debug(`onRightClick()`, this.app.data.map.atClick);
    if (this.mapInteract.isMeasuring()) {
      this.parseClickInMeasureMode(e.lonlat);
    }
  }

  /** Handle Map context menu event */
  protected onMapContextMenu(e: PointerEvent) {
    this.app.debug(`onMapContextMenu()`, this.app.data.map.atClick);
    this.onContextMenu(e);
  }

  /** Handle ol-map container context menu event */
  protected onContextMenu(e: PointerEvent) {
    this.app.debug(`onContextMenu()`, this.app.data.map.atClick);
    if (this.app.uiCtrl().suppressContextMenu) {
      return;
    }
    e.preventDefault();
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
    this.contextMenu.menuData = { item: this.mouse.coords };
    if (this.mapInteract.isMeasuring()) {
      this.parseClickInMeasureMode(this.mouse.xy.lonlat);
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

  /** process pointer click event when in measure mode */
  private parseClickInMeasureMode(pos: Position) {
    if (
      this.mapInteract.measureGeometryType === 'LineString' &&
      this.mapInteract.measurement().coords.length !== 0
    ) {
      this.onMeasureClick(pos);
    }
  }

  /** Toggle display of chart feature  */
  protected toggleFeatureSelection(id: string | string[], resType: 'charts') {
    if (resType === 'charts') {
      this.skres.chartSelected(id);
    }
  }

  /** Handle OL interaction start event */
  protected onDragBoxStart(e: DragBoxEvent) {
    let c = toLonLat(e.coordinate);
    this.mapInteract.initBoxCoord(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxEnd(e: DragBoxEvent) {
    let c = toLonLat(e.coordinate);
    this.mapInteract.stopBoxSelection(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxCancel(e: DragBoxEvent) {
    this.app.debug(`onDragBoxCancel()...`);
    this.mapInteract.stopBoxSelection();
  }

  /** Handle OL interaction start event */
  protected onMeasureStart(e: DrawEvent) {
    this.app.debug(`onMeasureStart()...`, this.mapInteract.measureGeometryType);
    let ovPosition: any;
    if (this.mapInteract.measureGeometryType === 'LineString') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let c = (e.feature.getGeometry() as any)
        .getCoordinates()
        .map((c: Position) => toLonLat(c));
      c = c.slice(0, c.length - 1);
      this.mapInteract.measurementCoords = c;
      ovPosition = c;
    } else {
      const g = e.feature.getGeometry() as any;
      const center = toLonLat(g.getCenter());
      const radius = g.getRadius();
      this.mapInteract.measurementCenter = center as Position;
      this.mapInteract.measurementRadius = radius;
      ovPosition = this.mapInteract.measurementCenter;
      this.app.debug(this.mapInteract.measurement);
    }
    this.formatPopover(null, null);
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        position: ovPosition,
        title: '0',
        show: true,
        type: 'measure'
      });
    });
  }

  /** Process pointer click in MEASURE mode */
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
    // ** update popover measurement values
    const c = this.mapInteract.measurement().coords.slice(-2);
    const b = getGreatCircleBearing(c[0], c[1]) ?? 0;
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        position: pt,
        title: `${this.app.formatValueForDisplay(
          lm,
          'm'
        )} ${this.app.formatValueForDisplay(b, 'deg')}`
      });
    });
  }

  /** Handle OL interaction start event */
  protected onMeasureEnd() {
    this.app.debug(`onMeasureEnd()...`);
    this.overlay.update((current) => {
      return Object.assign({}, current, {
        show: false
      });
    });
    this.mapInteract.stopMeasuring();
  }

  /**
   * Process pointer click in DRAW mode
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

  /** Handle OL interaction end event */
  protected onDrawEnd(e: { feature: Feature }) {
    this.mapInteract.stopDrawing(e.feature);
    this.drawEnded.emit(this.mapInteract.draw);
  }

  /** Enter modify mode */
  protected modifyFeature(featureType?: string) {
    if (this.mapInteract.draw.features.getLength() === 0) {
      return;
    }
    this.mapInteract.startModifying(this.overlay());
    if (this.overlay().type === 'route') {
      this.mapInteract.measurementCoords = this.skres.fromCache(
        'routes',
        this.overlay().id
      )[1].feature.geometry.coordinates;
    }
    if (featureType === 'anchor') {
      this.overlay().type = featureType;
      this.mapInteract.draw.forSave.id = featureType;
    }
  }

  /** Handle OL modify start event */
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

  /** Handle OL modify end event */
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

    this.app.debug(this.mapInteract.draw.forSave);
  }

  /** Process pointer click in non-interaction mode */
  private processMapClick(e) {
    const featureList: Map<
      string,
      {
        id: string;
        coord: Position;
        icon: string;
        text: string;
      }
    > = new Map(); // features under pointer
    const chartBoundsFeatures: Map<
      string,
      {
        id: string;
        coord: Position;
        icon: string;
        text: string;
      }
    > = new Map(); // chart bounds under pointer
    const fa = []; // features that can be the target of modify interaction
    let maskPopover = false; // suppress popover display

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
            const r = this.skres.fromCache('routes', t[1]);
            text = r[1].name;
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
        if (addToFeatureList && !featureList.has(id)) {
          featureList.set(id, {
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
      // show list of chart features
      this.formatPopover('chartlist.', e.lonlat, chartBoundsFeatures);
      return;
    }
    if (maskPopover) {
      return;
    }
    this.mapInteract.draw.features = new Collection(fa);
    if (featureList.size === 1) {
      // only 1 feature
      const v = featureList.values().next().value;
      this.formatPopover(v['id'], v['coord']);
    } else if (featureList.size > 1) {
      // show list of features
      this.formatPopover('list.', e.lonlat, featureList);
    }
  }

  // ******** POPOVER ACTIONS ************

  /**
   * build popover for selected feature
   * @param id: feature id
   * @param coord Position to display the popover
   * @param featureList list of map features at the supplied position
   * */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected formatPopover(
    id: string,
    coord: Position,
    featureList?: Map<string, any>
  ) {
    if (!id) {
      this.overlay.update((current) => {
        return Object.assign({}, current, { show: false });
      });
      return;
    }

    const poData: IPopover = {
      show: false,
      content: [],
      id: null,
      type: null,
      title: null,
      featureCount: this.mapInteract.draw.features?.getLength(),
      position: coord,
      readOnly: false,
      isSelf: false
    };

    let item = null;
    const t = id.split('.');
    let aid: string;

    switch (t[0]) {
      case 'anchor':
        this.modifyFeature('anchor');
        return;
      case 'bearing_dist':
        const d =
          GeoUtils.distanceTo(this.app.data.vessels.self.position, coord) ?? 0;
        const b =
          getGreatCircleBearing(this.app.data.vessels.self.position, coord) ??
          0;
        poData.type = t[0];
        poData.title = `${this.app.formatValueForDisplay(d, 'm')} ${this.app.formatValueForDisplay(b, 'deg')}`;
        poData.position = coord;
        poData.show = true;
        break;
      case 'list':
        poData.type = t[0];
        poData.title = 'Features';
        poData.content = [];
        featureList.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'chartlist':
        poData.type = t[0];
        poData.content = [];
        featureList.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'alarm':
        aid = id.split('.').slice(1).join('.');
        const alm = this.notiMgr.getAlert(aid) as any;
        if (!alm) {
          return false;
        }
        poData.type = t[0];
        poData.alarm = alm;
        poData.id = aid;
        poData.show = true;
        break;
      case 'vessels':
        poData.type = 'ais';
        poData.isSelf = true;
        poData.vessel = this.dfeat.self;
        poData.position = this.dfeat.self.position;
        poData.show = true;
        break;
      case 'ais-vessels':
        aid = id.slice(4);
        if (!this.dfeat.ais.has(aid)) {
          return false;
        }
        poData.type = 'ais';
        poData.id = aid;
        poData.vessel = this.dfeat.ais.get(aid);
        poData.position = poData.vessel.position;
        poData.show = true;
        break;
      case 'atons':
      case 'aton':
      case 'shore':
        if (!this.app.data.atons.has(id)) {
          return false;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = this.app.data.atons.get(id);
        poData.position = poData.aton.position;
        poData.show = true;
        break;
      case 'sar':
        if (!this.app.data.sar.has(id)) {
          return false;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = this.app.data.sar.get(id);
        poData.position = poData.aton.position;
        poData.show = true;
        break;
      case 'meteo':
        if (!this.app.data.meteo.has(id)) {
          return false;
        }
        poData.type = t[0];
        poData.id = id;
        poData.aton = this.app.data.meteo.get(id);
        poData.position = poData.aton.position;
        poData.show = true;
        break;
      case 'aircraft':
        if (!this.app.data.aircraft.has(id)) {
          return false;
        }
        poData.type = t[0];
        poData.id = id;
        poData.aircraft = this.app.data.aircraft.get(id);
        poData.position = poData.aircraft.position;
        poData.show = true;
        break;
      case 'region':
        item = [this.skres.fromCache('regions', t[1])];
        if (!item) {
          return false;
        }
        poData.id = t[1];
        poData.type = t[0];
        poData.title = 'Region';
        poData.resource = item[0];
        poData.show = true;
        poData.readOnly = item[0][1]?.feature?.properties?.readOnly ?? false;
        break;
      case 'note':
        item = this.skres.fromCache('notes', t[1]);
        if (!item) {
          return false;
        }
        poData.readOnly = item[1]?.properties?.readOnly ?? false;
        if (poData.readOnly) {
          poData.show = false;
          this.skres.showNoteDetails(item[0]);
        } else {
          poData.id = t[1];
          poData.type = t[0];
          poData.title = 'Note';
          poData.resource = item;
          poData.show = true;
        }
        break;
      case 'route':
        item = [this.skres.fromCache('routes', t[1])];
        if (!item) {
          return false;
        }
        poData.id = t[1];
        poData.type = t[0];
        poData.title = 'Route';
        poData.resource = item[0];
        poData.show = true;
        poData.readOnly = item[0][1]?.feature?.properties?.readOnly ?? false;
        break;
      case 'waypoint':
        item = [this.skres.fromCache('waypoints', t[1])];
        if (!item) {
          return false;
        }
        poData.id = t[1];
        poData.type = t[0];
        poData.resource = item[0];
        poData.title = 'Waypoint';
        poData.show = true;
        poData.readOnly = item[0][1]?.feature?.properties?.readOnly ?? false;
        break;
      case 'dest':
        poData.id = id;
        poData.type = 'destination';
        poData.resource = this.skres.buildWaypoint(coord) as [
          string,
          SKWaypoint
        ];
        poData.title = this.course.courseData().destPointName ?? 'Destination';
        poData.show = true;
        break;
      case 'rset':
        poData.id = id;
        poData.type = t[0];
        poData.resource = this.skresOther.fromResourceSetCache(id, true);
        poData.title =
          (poData.resource as GeoJsonFeature)?.properties?.name ??
          'Resource Set';
        poData.show = poData.resource ? true : false;
        break;
      default:
        return;
    }
    this.overlay.update(() => {
      return poData;
    });
  }

  /** handle selection from the FeatureList popover */
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

  /** handle popover closed event */
  protected popoverClosed() {
    this.overlay.update((current) => {
      return Object.assign({}, current, { show: false });
    });
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
  private rotateMap() {
    if (this.northUp) {
      this.mapRotation.set(0);
    } else {
      this.mapRotation.update(() => 0 - this.dfeat.active.orientation);
    }
  }

  // center map to active vessel position
  private centerVessel() {
    const pos = this.app.calcMapCenter(this.dfeat.active.position);
    this.mapCenterPositon.update(() => pos);
  }

  /** construct vessel lines for rendering */
  protected drawVesselLines(vesselUpdate = false) {
    const z = this.mapZoomLevel();
    const offset = z < 29 ? zoomOffsetLevel[Math.floor(z)] : 60;
    const wMax = 10; // max line length

    // update vessel trail
    if (vesselUpdate) {
      this.app.addToSelfTrail(this.dfeat.self.position);
    }

    // render laylines
    this.buildLaylines();

    // render cog, heading, twd, awa for focused vessel
    this.vesselLines.update(() => {
      const cog = this.dfeat.active.vectors.cog ?? [];

      const sog = this.dfeat.active.sog || 0;
      let hl = 0;
      if (this.app.config.vessels.headingLineSize === -1) {
        hl = (sog > wMax ? wMax : sog) * offset;
      } else {
        hl =
          Convert.nauticalMilesToKm(this.app.config.vessels.headingLineSize) *
          1000;
      }
      const heading = [
        this.dfeat.active.position,
        GeoUtils.destCoordinate(
          this.dfeat.active.position,
          this.dfeat.active.orientation,
          hl
        )
      ];

      return {
        cog: cog,
        heading: heading
      };
    });
  }

  /** calculate vessel & dest laylines & update signals */
  private buildLaylines() {
    if (
      this.app.config.vessels.laylines &&
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
          Angle.difference(this.course.courseData().bearing.value, twd_deg)
        ) < 90;

      // beat angle
      const ba_deg = Convert.radiansToDegrees(
        this.app.data.vessels.self.performance.beatAngle ?? Math.PI / 4
      );

      // gybe angle
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
            Angle.difference(this.course.courseData().bearing.value, twd_deg)
          ) < ba_deg
        : Math.abs(
            Angle.difference(this.course.courseData().bearing.value, twd_inv)
          ) < (ga_diff ?? 0);

      const dtg =
        this.app.config.units.distance === 'm'
          ? this.course.courseData().dtg * 1000
          : Convert.nauticalMilesToKm(this.course.courseData().dtg * 1000);

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

      this.perfTargetAngle.update(() => markLines);

      // vessel laylines
      if (destInTarget) {
        const hbd_deg = Angle.difference(
          twd_deg,
          this.course.courseData().bearing.value
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

        this.perfLaylines.update(() => {
          return {
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
        });
      }
    }
  }

  // ********************

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
    if (this.overlay().type === 'waypoint') {
      this.course.navigateToWaypoint(this.overlay().id);
    } else {
      this.activate.emit(this.overlay().id);
    }
  }

  // ** deactivate route / waypoint
  protected clearActiveFeature() {
    this.deactivate.emit(this.overlay().id);
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
    this.overlay.update((current) => {
      return Object.assign({}, current, { show: false });
    });
    if (mode === INTERACTION_MODE.MEASURE) {
      this.mapInteract.draw.style = value
        ? this.mapInteract.measureGeometryType === 'Circle'
          ? drawStyles.radius
          : drawStyles.measure
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
      this.skresOther.refreshResourceSetsInBounds();
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

  // ** returns true if skresOther.refreshResourceSetsInBounds() should be called
  private shouldFetchResourceSets(zoomChanged: boolean) {
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      if (!this.skresOther.anyResourceSetSelection()) {
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

  /**
   * @description Determine if Notes should be fetched from the server.
   * @param zoomChanged When true signifies that zoom level has changed.
   * @returns true if skres.refreshNotes() should be called
   */
  private shouldFetchNotes(zoomChanged: boolean) {
    this.showNoteslayer.update(
      () =>
        this.app.config.ui.showNotes &&
        this.app.config.map.zoomLevel >= this.app.config.resources.notes.minZoom
    );

    this.app.debug(`lastGet: ${this.app.data.lastGet}`);
    this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);

    if (zoomChanged) {
      if (this.mapZoomLevel() < this.app.config.resources.notes.minZoom) {
        return false;
      } else {
        return true;
      }
    }
    return this.mapMoveThresholdExceeded(
      this.app.config.resources.notes.getRadius
    );
  }

  /**
   * @decsription Retrieves and displays feature information
   * @param pos Position of feature(s) to retrieve
   * @todo Experiment
   */
  private getFeatureInfo(pos: Position) {
    if (!this.app.config.resources.featureServer.url) return;
    // parse url tokens
    const u = this.app.config.resources.featureServer.url
      .replaceAll('%longitude%', pos[0].toString())
      .replaceAll('%latitude%', pos[1].toString())
      .replaceAll('%map:zoom%', this.mapZoomLevel().toFixed(1));

    this.http.get(u).subscribe(
      (r: { type: string; features: Feature[] }) => {
        if (Array.isArray(r?.features)) {
          this.bottomSheet.open(FeaturePropertiesModal, {
            disableClose: true,
            data: r.features
          });
        } else {
          this.app.showAlert('Invalid Response', 'Invalid data received!');
        }
      },
      (error) => {
        this.app.parseHttpErrorResponse(error);
      }
    );
  }
}
