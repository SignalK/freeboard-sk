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
  computed,
  input,
  effect,
  inject,
  NgZone,
  TemplateRef,
  untracked
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  RoutePointPopoverComponent,
  VesselPopoverComponent,
  S57PopoverComponent,
  S57_CLICKABLE_LAYERS,
  S57_NAMES
} from './popovers';
import { FreeboardOpenlayersModule } from 'src/app/modules/map/ol';
import { CpaTarget } from 'src/app/modules/map/ol/lib/alarms/layer-cpa-alarm.component';
import { CoordsPipe } from 'src/app/lib/pipes';

import { getGreatCircleBearing } from 'geolib';
import { bearingDistanceReadout } from './bearing-distance';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Stroke, Fill } from 'ol/style';
import { Collection, Feature, Map as OlMap } from 'ol';
import { Feature as GeoJsonFeature } from 'geojson';

import { Convert, SI_BASE_UNIT, TARGET_UNIT } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import {
  computeLaylines,
  laylineInput,
  NO_LAYLINES
} from 'src/app/lib/laylines';
import { trueWindDirection } from 'src/app/lib/true-bearing';
import { zoomKeyDirection } from 'src/app/lib/zoom-keys';
import { isPanKey } from 'src/app/lib/pan-keys';
import { shownFromZoom } from './ol/lib/charts/chart-utils';
import { zoomDisplayText } from 'src/app/lib/zoom-display';
import { isRefollowActivity, RefollowTimer } from 'src/app/lib/refollow-timer';
import { computeCursorEta, CursorEtaInfo } from './cursor-eta';
import { CursorPin, tapFadeMs, TAP_MAX_DURATION } from './cursor-marker';
import {
  FBRoute,
  FBRoutes,
  FBTrack,
  LineString,
  MultiLineString,
  Position
} from 'src/app/types';

import { AppFacade } from 'src/app/app.facade';
import { RadarAPIService } from 'src/app/modules/radar/radar-api.service';
import { GuardZoneEditService } from 'src/app/modules/radar/guard-zone-edit.service';
import { powerState, sendsImage } from 'src/app/modules/radar/radar-controls';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import { ExtActionsComponent } from 'src/app/modules/plotterext/ext-actions.component';
import type { UsableAction } from 'src/app/modules/plotterext/actions';
import { pickedTarget } from 'src/app/modules/plotterext/map-pick';
import {
  type ChartTarget,
  chartFeatureTarget,
  featureTarget,
  overlayFeatureTarget,
  positionTarget,
  type TargetSources
} from './map-targets';
import type { OverlayHit } from './ol/lib/data-overlay/overlay-hits';
import type { OverlayFeatureTarget } from 'signalk-plotterext-bus/host';
import {
  SecondaryTap,
  SplitViewService
} from './split-view/split-view.service';
import {
  activeZoom,
  gateZoom,
  paneStatusBarLift
} from './split-view/split-view';
import {
  radarRange,
  rangeRingScale,
  ringLabel
} from 'src/app/modules/radar/range-rings';
import {
  RangeRing,
  sameRings
} from 'src/app/modules/map/ol/lib/navigation/layer-range-circles.component';

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
  InfoPanelFacade,
  SKResourceType
} from 'src/app/modules';
import {
  mapControls,
  mapInteractions,
  aircraftStyles,
  sarStyles,
  regionStyles,
  routeStyles,
  anchorStyles,
  alarmStyles,
  destinationStyles,
  laylineStyles,
  drawStyles,
  routeDraftStyles,
  targetAngleStyle,
  raceCourseStyles,
  bearingDistanceStyle,
  scaleLineUnits
} from './mapconfig';
import { SKRoute } from 'src/app/modules/skresources/resource-classes';
import { RouteReverseService } from 'src/app/modules/skresources/route-reverse.service';
import {
  RouteBuffer,
  RouteBufferRegistry
} from 'src/app/modules/plotterext/route-buffer.registry';
import { ModifyEvent } from 'ol/interaction/Modify';
import { DrawEvent } from 'ol/interaction/Draw';
import { Coordinate } from 'ol/coordinate';
import {
  FBClickEvent,
  FBMapEvent,
  FBPointerDownEvent,
  FBPointerEvent,
  FBRightClickEvent,
  zoomOffsetLevel,
  MapComponent
} from './ol/lib/map.component';
import { FeatureLike } from 'ol/Feature';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FBMapInteractService,
  DrawFeatureInfo,
  DrawFeatureSaveInfo,
  IPopover
} from './fbmap-interact.service';
import { ScaleLine } from 'ol/control';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { MapService } from './ol/lib/map.service';
import { FOLLOWS_VESSEL, FollowsVessel } from './ol/lib/view.directive';
import { InteractionDrawComponent } from './ol/lib/interactions/interaction-draw.component';
import {
  hitToleranceForPointer,
  RESIZING,
  worldCopyOffset
} from './ol/lib/util';
import { LineString as OLLineString } from 'ol/geom';
import {
  extendRouteAtClick,
  RoutePointMeta,
  shouldExtendRoute,
  unlinkMovedPoints,
  WORLD_WIDTH_3857
} from './route-extend';
import { vertexDeleted } from './ol/lib/vertex-delete';
import { modifiedLegIndex } from './route-modify-leg';
import {
  drawnRouteMeta,
  linkPointOnWaypoint,
  touchedVertex,
  WaypointLookup
} from './route-waypoint-links';
import { waypointSnapAt } from './ol/lib/waypoint-snap';
import { drawnWaypoints } from './ol/lib/resources/route-waypoint-overlap';
import {
  ActiveRoutePoint,
  followedPointIndex,
  pickRoutePoints,
  preferredRoutePoint,
  ROUTE_POINT_PICK_PX
} from './route-point-pick';
import { AppIconDef, SymbolService } from '../icons';
import {
  coordinatesMetaFromPoints,
  editsRouteBuffer
} from '../skresources/components/route-reorder.util';
import { LayerWindWeatherComponent } from './ol/lib/resources/layer-wind-weather.component';
import { LayerCurrentsWeatherComponent } from './ol/lib/resources/layer-currents-weather.component';
import { TidalCurrentsLayerComponent } from './ol/lib/resources/tidal-currents-layer.component';
import {
  TidalCurrentsService,
  GridSample
} from './ol/lib/tidal-currents.service';
import { TRACK_HISTORY_ID } from './ol/lib/vessel/layer-track-history.component';
import { trackTimesHiddenByVessel, trailTapTrack } from './track-time-taps';
import {
  OTHER_STOP_MS,
  OWN_STOP_MS,
  ROUTE_TOLERANCE_M,
  trackSectionRoute,
  trackSectionSpan
} from './track-route';
import { Observable, Subscription } from 'rxjs';
import { TrackHistoryService } from 'src/app/modules/skstream/track-history.service';
import { AIS_TRACK_MIN_ZOOM } from 'src/app/modules/skstream/track-source';
import {
  durationLabel,
  HistoryTrack,
  PointTime,
  poseAt,
  TimedTrack,
  trackTimeInfo
} from 'src/app/modules/skstream/track-history';
import { chartTimeShortLabel } from 'src/app/lib/components/dialogs/chart-time-dialog';

/** An entry in the feature-list popover built from the features at a click. */
interface FeatureListEntry {
  id: string;
  coord: Position;
  icon: AppIconDef | string | undefined;
  text: string | undefined;
}

interface IResource {
  id: string;
  type: string;
  /** Pre-resolved resource. When set (an unsaved route buffer), the properties
   *  dialog opens from it instead of fetching from the server (#583). */
  resource?: FBRoute;
}

interface IFeatureData {
  aircraft: Map<string, SKAircraft>;
  atons: Map<string, SKAtoN>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
  self: SKVessel; //self vessel
  ais: Map<string, SKVessel>; // other vessels
  active: SKVessel; // focussed vessel
  navData: { position: Position | null; startPosition: Position | null };
  closest: Array<CpaTarget>;
}

/** What a track popover shows. */
type TrackHistoryPopover = NonNullable<IPopover['trackHistory']>;

/** A tapped recorded track, as its popover is answered from. */
interface TrackHistoryFeature {
  context: string;
  /** Shown instead of the context's label, for a stored track. */
  name?: string;
  lines: Position[][];
  times?: PointTime[][];
  at: Position;
}

/** How long a vessel stays put where a passage of its track ends. */
const stopMs = (context: string) =>
  context === 'self' ? OWN_STOP_MS : OTHER_STOP_MS;

enum INTERACTION_MODE {
  MEASURE,
  DRAW,
  MODIFY
}

/** How long the vessel is held dead centre after follow mode is turned on,
 * before the configured centre offset is applied. */
const OFFSET_GRACE_PERIOD = 2000;

/**
 * Prefix of the ids Freeboard gives the data-overlay features it lists after a
 * click (capability `actions.overlay`), followed by the owning extension,
 * overlay, source and feature id. Only the prefix is read: an overlay feature's own id is the
 * extension's and is never read as one of the map's. A list left open names
 * its features by these ids, so a later click can make one unknown, never
 * another feature.
 */
const OVERLAY_FEATURE_ENTRY = 'overlay-feature.';

@Component({
  selector: 'fb-map',
  imports: [
    MatTooltipModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CoordsPipe,
    NgTemplateOutlet,
    MatCardModule,
    MatMenuModule,
    FreeboardOpenlayersModule,
    ExtActionsComponent,
    PopoverComponent,
    FeatureListPopoverComponent,
    ChartListPopoverComponent,
    AtoNPopoverComponent,
    AircraftPopoverComponent,
    AlarmPopoverComponent,
    ResourcePopoverComponent,
    ResourceSetPopoverComponent,
    RoutePointPopoverComponent,
    VesselPopoverComponent,
    S57PopoverComponent,
    LayerWindWeatherComponent,
    LayerCurrentsWeatherComponent,
    TidalCurrentsLayerComponent
  ],
  templateUrl: './fb-map.component.html',
  styleUrls: ['./fb-map.component.css']
})
export class FBMapComponent implements OnInit, OnDestroy {
  @Input() setFocus?: string;
  @Input() mapCenter: Position = [0, 0];
  @Input() mapZoom = 1;
  @Input() movingMap = false;
  @Input() northUp = true;
  @Input() measureMode?: boolean;
  @Input() drawMode?: boolean;
  @Input() modifyMode = false;
  @Input() activeRoute?: string | null;
  @Input() vesselTrail: Array<Position> = [];
  @Input() dblClickZoom = false;
  @Input() overZoomTiles = true;
  @Output() drawEnded: EventEmitter<DrawFeatureInfo> = new EventEmitter();
  @Output() activate: EventEmitter<string> = new EventEmitter();
  @Output() deactivate: EventEmitter<string> = new EventEmitter();
  @Output() info: EventEmitter<IResource> = new EventEmitter();
  @Output() exitMovingMap: EventEmitter<boolean> = new EventEmitter();
  @Output() resumeMovingMap: EventEmitter<void> = new EventEmitter();
  @Output() focusVessel: EventEmitter<string | null> = new EventEmitter();
  @Output() menuItemSelected: EventEmitter<string> = new EventEmitter();

  // Both are unconditional in the template; static queries resolve before
  // ngOnInit and olMap before ngAfterViewInit, ahead of any use.
  @ViewChild(MatMenuTrigger, { static: true }) contextMenu!: MatMenuTrigger;
  @ViewChild('olMap', { static: false }) olMap!: MapComponent;
  /**
   * The status bar (position, zoom and cursor ETA readout). It is shown in
   * whichever split-view pane is active, so the second pane renders it too.
   */
  @ViewChild('statusBar', { static: true }) statusBar!: TemplateRef<unknown>;
  /** Only in the template while drawing. */
  @ViewChild('routeDraw', { static: false })
  routeDraw?: InteractionDrawComponent;

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
  protected trueWindDirection = trueWindDirection;
  protected olMapInteractions = signal<Array<{ name: string }>>([]);
  protected mapZoomLevel = signal<number>(1);
  /** Room left under the status bar for widgets along the bottom of the screen. */
  protected statusBarLift = computed(() =>
    paneStatusBarLift(
      this.plotterExt.statusBarLift(),
      !!this.splitView.secondaryMap(),
      this.splitView.stacked(),
      this.splitView.secondaryActive()
    )
  );
  /**
   * The higher zoom of the panes on screen. Layers shown only from some zoom
   * on exist while either pane is that far in; each map then hides them at
   * its own zoom through the layer's minZoom.
   */
  protected paneZoomMax = computed(() =>
    gateZoom(
      this.mapZoomLevel(),
      this.splitView.secondaryMap() ? this.splitView.zoom() : null
    )
  );
  /** Zoom the chart menu was opened at, on whichever pane. */
  protected menuZoom = signal(0);
  private zoomGates = new Map<number, { minZoom: number }>();
  // Matches the zoom buttons: the active pane's zoom.
  protected mapZoomText = computed(() => zoomDisplayText(this.viewZoom()));
  /** The zoom of the pane the zoom buttons act on. */
  protected viewZoom = computed(() =>
    activeZoom(
      this.mapZoomLevel(),
      this.splitView.zoom(),
      this.splitView.secondaryActive()
    )
  );
  protected mapCenterPositon = signal<Position>([0, 0]);
  protected mapRotation = signal<number>(0);

  // ** map feature styles
  protected featureStyles = {
    route: routeStyles,
    region: regionStyles,
    anchor: anchorStyles,
    alarm: alarmStyles,
    destination: destinationStyles,
    aircraft: aircraftStyles,
    sar: sarStyles,
    layline: laylineStyles,
    targetAngle: targetAngleStyle,
    raceCourse: raceCourseStyles,
    bearingDistance: bearingDistanceStyle
  };

  // Live route edit buffers (unsaved drafts) rendered via a second fb-routes
  // layer in the amber draft style.
  protected draftRouteStyles = routeDraftStyles;
  protected bufferRoutes = computed<FBRoutes>(() =>
    this.routeBuffers
      .live()
      // A saved + clean route renders from the resource layer (green); only
      // unsaved or dirty routes get the amber draft styling.
      .filter((b) => !b.saved || b.dirty)
      .map((b) => this.bufferToFBRoute(b))
  );

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

  private saveTimer?: ReturnType<typeof setInterval>;
  private isDirty = false;
  /** A user drag is in flight under the 'offset' pan behavior — the resulting
   * map centre becomes the new vessel centre offset. */
  private userPanned = false;
  private offsetGraceTimer?: ReturnType<typeof setTimeout>;
  /** Map centre as of the last move-end, so the next one can tell a pan (the
   * user) from a rotation (heading-up turning the chart on its own). */
  private lastMoveCenter: Position | null = null;
  /** Brings follow mode back once the display has been idle for the configured
   * delay after a pan released it (#714). Never armed unless that delay is set. */
  private refollow = new RefollowTimer(() =>
    // Armed from a pointer drag, so the expiry fires outside the Angular zone;
    // re-enter it so resuming follow mode propagates to the UI.
    this.ngZone.run(() => this.resumeMovingMap.emit())
  );
  /** True while the vessel is held dead centre just after follow mode is
   * turned on (see startOffsetGrace). */
  private offsetSuppressed = false;
  /**
   * EPSG:3857-metre offset of the world copy the most recent click landed in.
   * Passed to overlays so a popover is drawn in the copy the user clicked, not
   * the primary world. Render-space only — never written to stored data (#572).
   */
  private clickWorldOffset = 0;
  /**
   * Raw EPSG:3857 x of the most recent click, world-copy-aware. Used to align an
   * edited feature with the copy the user is looking at before Modify hit-tests
   * it (a route's own coordinates may be unwrapped past ±180, so the click's
   * world alone isn't enough — align by the feature's extent). See #572.
   */
  private clickMercX = 0;
  /** The sketch of the route being drawn; OL updates its geometry in place. */
  private drawSketch: Feature | undefined;

  // Cursor position readout. A signal so the readout (and measure overlay)
  // refresh when pointer-move runs OUTSIDE the Angular zone (see MapComponent).
  protected mouse = signal<{
    pixel: number[] | null;
    coords: Position;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xy: any;
  }>({
    pixel: null,
    coords: [0, 0],
    xy: null
  });
  // A touch screen raises no pointer event until it is touched, so until one
  // arrives the readout shows the chart centre rather than a blank 0,0.
  private pointerSeen = false;
  // Bearing/distance/ETA from the vessel to the cursor, shown in the status bar
  // when the "Live ETA at cursor" option is enabled (null = hidden).
  protected cursorInfo = signal<CursorEtaInfo | null>(null);
  /**
   * Holds that readout on a tapped point for a few seconds, marked on the chart
   * (#546). Expiring drops the readout with the marker so a bearing is never
   * left on screen with nothing identifying the point it refers to.
   */
  private cursorPin = new CursorPin(() => this.cursorInfo.set(null));
  /**
   * The pin's marker as a 0-or-1 element list: the fade is a CSS animation, so
   * the template tracks by id to get a *new* element per tap rather than
   * repositioning one whose animation has already run.
   */
  protected cursorMarkers = computed(() => {
    const m = this.cursorPin.marker();
    return m ? [m] : [];
  });
  /**
   * The split view's second pane when the latest tap landed there, undefined
   * for this chart. An overlay opened by a tap (a popover, the tap marker, a
   * Bearing & Distance label) keeps the map it opened on, and is drawn there
   * while that map is the second pane.
   */
  private clickMap: OlMap | undefined;
  private popoverMap = signal<OlMap | undefined>(undefined);
  private pinMap = signal<OlMap | undefined>(undefined);
  private bearingMap = signal<OlMap | undefined>(undefined);
  protected popoverPane(): OlMap | undefined {
    return this.inPane(this.popoverMap());
  }
  protected pinPane(): OlMap | undefined {
    return this.inPane(this.pinMap());
  }
  protected bearingPane(): OlMap | undefined {
    return this.inPane(this.bearingMap());
  }
  /**
   * The split view's second pane opened or closed. Overlays left on a closed
   * pane would move to this chart, into the world copy the pane showed; an
   * open popover would also block the chart menu. And its map is let go.
   */
  private onPaneChanged(pane: OlMap | null) {
    const gone = (map: OlMap | undefined) => !!map && map !== pane;
    if (gone(this.popoverMap())) {
      this.popoverClosed();
    }
    if (gone(this.pinMap())) {
      this.pinMap.set(undefined);
      this.cursorPin.release();
    }
    if (gone(this.bearingMap())) {
      this.bearingMap.set(undefined);
      const worldOffset = this.viewWorldOffset();
      this.mapInteract.bearingDistance.update(
        (bd) => bd && { ...bd, worldOffset }
      );
    }
    if (gone(this.clickMap)) {
      this.clickMap = undefined;
    }
  }

  /** The world copy this chart is looking at, as an x offset. */
  private viewWorldOffset(): number {
    const center = this.olMap?.getMap()?.getView().getCenter();
    return center ? worldCopyOffset(center[0], WORLD_WIDTH_3857) : 0;
  }
  private inPane(map: OlMap | undefined): OlMap | undefined {
    return map && map === this.splitView.secondaryMap() ? map : undefined;
  }
  /** When the gesture in flight pressed down — a tap is a short press. */
  private pointerDownAt = 0;
  contextMenuPosition = { x: '0px', y: '0px' };
  // Empty widget-anchor cell at the last right-click (or null) — gates and
  // drives the "Add widget here" context-menu item (desktop).
  protected addableWidgetCell: ReturnType<
    PlotterExtensionService['addableCellAt']
  > = null;

  private obsList: Subscription[] = [];

  private http = inject(HttpClient);
  protected app = inject(AppFacade);
  protected skres = inject(SKResourceService);
  protected skresOther = inject(FBCustomResourceService);
  protected skstream = inject(SKStreamFacade);
  protected anchor = inject(AnchorService);
  protected notiMgr = inject(NotificationManager);
  protected plotterExt = inject(PlotterExtensionService);
  protected course = inject(CourseService);
  protected symbols = inject(SymbolService);
  private routeReverse = inject(RouteReverseService);
  protected mapInteract = inject(FBMapInteractService);
  protected mapService = inject(MapService);
  protected splitView = inject(SplitViewService);
  private settings = inject(SettingsFacade);
  private bottomSheet = inject(MatBottomSheet);
  private infoPanel = inject(InfoPanelFacade);
  protected routeBuffers = inject(RouteBufferRegistry);
  private tidalCurrents = inject(TidalCurrentsService);
  protected trackHistory = inject(TrackHistoryService);
  protected radarApi = inject(RadarAPIService);
  protected zoneEdit = inject(GuardZoneEditService);
  // without an image to draw, dropping the spoke stream lets the provider
  // rest the radar
  protected radarImage = computed(() => {
    const radar = this.radarApi.radar();
    return sendsImage(
      powerState(
        radar?.capabilities?.controls?.['power'],
        radar?.controls?.get('power')?.value
      )
    );
  });
  // "Show Track" draws AIS tracks from this zoom, as the stream worker fetches them
  protected readonly aisTrackMinZoom = AIS_TRACK_MIN_ZOOM;
  // Layers drawn at the vessel take each fix at once, not when the glide
  // towards it ends, and are shifted along with the glide (ViewDirective)
  // while the map follows the active vessel. Layers drawn at our own vessel
  // only move with it while that is the active one.
  protected readonly followsVessel = {
    updateWhileAnimating: true,
    [FOLLOWS_VESSEL]: (() => this.movingMap) satisfies FollowsVessel
  };
  protected readonly followsSelf = {
    updateWhileAnimating: true,
    [FOLLOWS_VESSEL]: (() =>
      this.movingMap &&
      this.app.data.vessels.activeId === null) satisfies FollowsVessel
  };
  // Radar rings are drawn at our own vessel, other range circles at the
  // active one.
  protected readonly followsRangeCircles = {
    updateWhileAnimating: true,
    [FOLLOWS_VESSEL]: (() =>
      this.movingMap &&
      (!this.showsRadarRings() ||
        this.app.data.vessels.activeId === null)) satisfies FollowsVessel
  };
  private ngZone = inject(NgZone);
  // range circles at the radar range, while the radar shows on this screen
  // and transmits
  protected showsRadarRings(): boolean {
    return this.app.config.radars.rings && this.radarRings().length > 0;
  }
  protected radarRings = computed<RangeRing[]>(
    () => {
      const radar = this.radarApi.radar();
      const transmitting = sendsImage(
        powerState(
          radar?.capabilities?.controls?.['power'],
          radar?.controls?.get('power')?.value
        )
      );
      if (!this.app.uiCtrl().radarLayer || !transmitting) {
        return [];
      }
      // the scale units input follows the distance unit, so a unit change
      // redraws the rings
      const scale = rangeRingScale(
        radarRange(radar),
        (this.scaleUnits() || this.app.config.units.distance) as TARGET_UNIT
      );
      if (!scale) {
        return [];
      }
      return scale.distances.map((distance) => ({
        distance,
        label: ringLabel(distance, scale.unit)
      }));
    },
    { equal: sameRings }
  );

  constructor() {
    effect(() => {
      if (this.scaleUnits()) {
        this.setScaleUnits();
      }
    });
    this.toggleDblClickZoom(); // init olMapinterations
    effect(() => {
      const pane = this.splitView.secondaryMap();
      untracked(() => this.onPaneChanged(pane));
    });
    // A guard zone edit is a modal interaction a pick must give way to.
    effect(() => {
      const editing = !!this.zoneEdit.edit();
      untracked(() => this.mapInteract.setZoneEditing(editing));
    });
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
    // Taps and the pointer on the split view's second pane, which shows this
    // chart's features
    this.obsList.push(
      this.splitView.taps$.subscribe((tap) => this.onSecondaryTap(tap)),
      this.splitView.pointer$.subscribe((lonlat) =>
        this.onSecondaryPointer(lonlat)
      )
    );
    // SETTINGS settings.change$ event
    this.obsList.push(
      this.settings.change$.subscribe((r: string[]) => {
        this.renderMapContents(r.includes('fetchNotes'));
        if (r.includes(`trailSource`)) {
          if (!this.app.serverTrailWanted()) {
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
    this.stopOffsetGrace();
    this.refollow.cancel();
    this.cursorPin.release();
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
        // Following again — by the Follow button or by the timer below — so the
        // countdown has nothing left to do. Only the `false` branch may leave it
        // armed: that is the pan-triggered exit that armed it in the first place.
        this.refollow.cancel();
        this.startSaveTimer();
        this.startOffsetGrace();
      } else {
        this.stopSaveTimer();
        // Leave the chart where it is when follow mode is released — snapping
        // back to the vessel would undo the pan that just released it.
        this.stopOffsetGrace();
        this.userPanned = false;
      }
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
    const map = this.olMap?.getMap();
    if (!map) {
      return;
    }
    try {
      const c = map.getControls().getArray();
      (c[0] as ScaleLine).setUnits(scaleLineUnits(this.scaleUnits()));
    } catch {
      // no scale control
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
      this.saveTimer = undefined;
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
      const v: CpaTarget[] = [];
      const self = this.app.data.vessels.self.position;
      if (self) {
        this.app.data.vessels.closest.forEach((id: string) => {
          const target = this.app.data.vessels.aisTargets.get(id)?.position;
          const cpa = this.app.data.vessels.cpaPositions.get(id);
          if (target || cpa) {
            v.push({
              self,
              target: target ?? undefined,
              selfAtCpa: cpa?.self,
              targetAtCpa: cpa?.target
            });
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
      ['ais', 'aton', 'aircraft'].includes(this.overlay().type ?? '')
    ) {
      if (this.overlay().isSelf) {
        this.overlay.update((current) => {
          return Object.assign({}, current, {
            position: this.dfeat.self.position ?? current.position,
            vessel: this.dfeat.self
          });
        });
      } else {
        const { id, type } = this.overlay();
        if (this.popoverTargetGone()) {
          this.overlay().show = false;
        } else if (type === 'ais' && id !== null) {
          const vessel = this.dfeat.ais.get(id);
          if (vessel) {
            this.overlay.update((current) => {
              return Object.assign({}, current, {
                position: vessel.position ?? current.position,
                vessel
              });
            });
          }
        }
      }
      // The popover follows the vessel in whichever world copy it was opened in:
      // position stays canonical and the overlay's worldOffset (preserved across
      // these updates) draws it in the right copy (#572).
    }
    this.drawVesselLines(this.app.data.vessels.self.positionReceived);
    this.rotateMap();
    if (this.movingMap) {
      this.centerVessel();
    }
  }

  /**
   * Whether the AIS vessel, AtoN, SaR beacon or aircraft the open popover
   * shows is no longer received. AtoN and SaR popovers share the 'aton' type,
   * so the id's prefix says which list to look in.
   */
  private popoverTargetGone(): boolean {
    const { id, type } = this.overlay();
    if (id === null) {
      return type === 'ais' || type === 'aton' || type === 'aircraft';
    }
    switch (type) {
      case 'ais':
        return !this.dfeat.ais.has(id);
      case 'aton':
        return !(id.startsWith('sar.') ? this.dfeat.sar : this.dfeat.atons).has(
          id
        );
      case 'aircraft':
        return !this.dfeat.aircraft.has(id);
      default:
        return false;
    }
  }

  // ********** RADAR EVENT HANDLERS *****************

  handleRadarError(error: Error) {
    this.app.showAlert('Radar', error.message);
    this.app.uiCtrl.update((current) => {
      return Object.assign(current, { radarLayer: false });
    });
  }

  // ********** MAP EVENT HANDLERS *****************

  private toggleDblClickZoom(set?: boolean) {
    // keyboardzoom is left out: onMapKeydown handles +/- so it preserves the
    // follow offset, the same as the on-screen zoom buttons.
    this.olMapInteractions.set(mapInteractions(!!set));
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
        this.bearingMap.set(this.clickMap);
        this.mapInteract.showBearingDistanceFromVessel(
          pos,
          this.clickWorldOffset
        );
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
      case 'add_widget':
        if (this.addableWidgetCell) {
          this.plotterExt.openAddWidgetPicker(
            this.addableWidgetCell.anchor,
            this.addableWidgetCell.cell
          );
        }
        break;
      case 'get_feature_info':
        this.getFeatureInfo();
        break;
      default:
        this.menuItemSelected.emit(action);
        break;
    }
  }

  /** The user chose an extension action from the chart context menu. */
  protected onExtensionAction(a: UsableAction, target: ChartTarget) {
    this.plotterExt.invokeAction(a.extension, a.action.id, target);
  }

  /** Where the map finds what a target is made from (capability `actions`). */
  private get targetSources(): TargetSources {
    return {
      waypoint: (id) => this.skres.fromCache('waypoints', id),
      note: (id) => this.skres.fromCache('notes', id),
      route: (id) => this.skres.fromCache('routes', id),
      region: (id) => this.skres.fromCache('regions', id),
      track: (id) => this.skres.fromCache('tracks', id),
      draftRoute: (routeId) => this.getUnsavedRouteBuffer(routeId),
      visibleRouteId: (id) => this.routeBuffers.getForRoute(id)?.routeId,
      self: () => this.dfeat.self,
      vessel: (context) => this.dfeat.ais.get(context),
      aton: (context) => this.app.data.atons.get(context)
    };
  }

  /**
   * The targets of the features under the pointer, once each, in hit order:
   * the map's own features by id, S-57 chart features by their tile
   * properties, and the selectable features of interactive data overlays
   * (capability `actions.overlay`), placed where they were hit.
   */
  private targetsAt(
    features: FeatureLike[],
    overlayHits: OverlayHit[] | undefined,
    at: Position
  ): ChartTarget[] {
    const seen = new Set<string>();
    const targets: ChartTarget[] = [];
    const overlays = this.overlayTargets(overlayHits ?? [], at);
    let next = 0;
    features.forEach((feature, i) => {
      while (next < overlays.length && overlays[next].above <= i) {
        targets.push(overlays[next++].target);
      }
      const id = feature.getId();
      let key: string;
      let target: ChartTarget | null = null;
      if (id && typeof id === 'string') {
        key = id;
        if (!seen.has(key)) target = featureTarget(id, at, this.targetSources);
      } else {
        const props = feature.getProperties?.() ?? {};
        if (!props['RCID'] || !S57_CLICKABLE_LAYERS.has(props['layer'])) {
          return;
        }
        key = `s57.${props['LNAM']}`;
        if (!seen.has(key)) target = chartFeatureTarget(props, at, feature);
      }
      seen.add(key);
      if (target) targets.push(target);
    });
    targets.push(...overlays.slice(next).map((o) => o.target));
    return targets;
  }

  /**
   * The targets of the interactive data-overlay features under the pointer,
   * each with its place in the hit order. A feature whose overlay is no
   * longer drawn is left out.
   */
  private overlayTargets(
    hits: OverlayHit[],
    at: Position
  ): Array<{ target: ChartTarget; above: number }> {
    const result: Array<{ target: ChartTarget; above: number }> = [];
    for (const hit of hits) {
      const overlay = this.plotterExt.overlays.entry(hit.overlayKey);
      if (!overlay?.interactive) continue;
      result.push({
        target: overlayFeatureTarget(
          hit,
          {
            extension: overlay.extension,
            id: overlay.id,
            title: overlay.title,
            titleProperty: overlay.titleProperty
          },
          at
        ),
        above: hit.above
      });
    }
    return result;
  }

  /** The target a feature popover shows, for its extension actions. */
  private popoverTarget(id: string, at: Position): ChartTarget | undefined {
    if (id.startsWith(OVERLAY_FEATURE_ENTRY)) {
      return this.overlayFeatures[id];
    }
    if (id.startsWith('s57.')) {
      const props = this.s57Features[id];
      return props
        ? chartFeatureTarget(props, at, this.s57FeatureLikes[id])
        : undefined;
    }
    return featureTarget(id, at, this.targetSources) ?? undefined;
  }

  /**
   * Extension actions for a context request: each feature target under the
   * pointer with its actions, then the position itself.
   */
  private extensionActionGroups(
    features: FeatureLike[],
    overlayHits: OverlayHit[],
    at: Position
  ): Array<{ target: ChartTarget; actions: UsableAction[] }> {
    const position = positionTarget(at);
    position.label = 'This position';
    return [...this.targetsAt(features, overlayHits, at), position]
      .map((target) => ({
        target,
        actions: this.plotterExt.actionsFor(target)
      }))
      .filter((g) => g.actions.length > 0);
  }

  /** Tell the stream worker the initial view: a fresh map emits no move-end
   * until the user moves it, and the AIS tracks request is scoped to the view. */
  protected onMapReady() {
    const view = this.olMap?.getMap()?.getView();
    const zoom = view?.getZoom();
    if (typeof zoom === 'number') {
      this.skstream.postMapView(this.olMap.getMapExtent(), zoom);
      this.trackHistory.setView(this.olMap.getMapExtent(), zoom);
    }
    const center = view?.getCenter();
    if (center) {
      this.showCentreUntilPointer(toLonLat(center) as Position);
    }
  }

  private showCentreUntilPointer(center: Position) {
    if (!this.pointerSeen) {
      const coords = GeoUtils.normaliseCoords(center);
      this.mouse.update((mouse) => ({ ...mouse, coords }));
    }
  }

  // handle map move / zoom
  protected onMapMoveEnd(e: FBMapEvent) {
    // Drawn larger than it shows while the split view's divider is dragged;
    // the move-end when it is drawn at its real size again is the one to keep.
    if (e.map?.get(RESIZING)) {
      return;
    }
    this.app.config.map.zoomLevel = e.zoom;
    this.app.mapZoom.set(e.zoom);

    this.app.mapExtent.update(() => e.extent);
    this.skstream.postMapView(e.extent, e.zoom);
    this.trackHistory.setView(e.extent, e.zoom);
    this.app.mapViewTopCenter.update(() => e.topCenter as Position);
    this.app.mapViewRightCenter.update(() => e.rightCenter as Position);
    this.app.mapViewRotation.update(() => e.rotation);
    this.app.config.map.center = e.lonlat as Position;
    this.showCentreUntilPointer(e.lonlat as Position);

    if (this.userPanned) {
      // Adopt where the user left the vessel on screen only once the pan (and
      // any kinetic glide) has settled, so the offset matches what they see.
      // The pan IS the offset gesture, so it also ends the post-tap grace.
      this.userPanned = false;
      this.stopOffsetGrace();
      const outcome = this.app.applyPanGesture(e.lonlat as Position);
      if (outcome === 'release') {
        // Panned the vessel clean off screen: stop following and leave the
        // chart where it is, rather than clamping the vessel back on screen.
        this.exitMovingMap.emit(true);
      } else if (outcome === 'adopted') {
        this.app.saveConfigDebounced();
      }
    }

    // A pan or zoom restarts the idle countdown; a rotation-only move-end must
    // not (#714) — see isRefollowActivity. Testing the centre here is what
    // catches a pan that emits no pointer drag, such as the arrow keys.
    if (isRefollowActivity(e, this.lastMoveCenter)) {
      this.refollow.reset();
    }
    this.lastMoveCenter = e.lonlat as Position;

    this.drawVesselLines();
    if (!this.movingMap) {
      // debounce: a flurry of pans/zooms collapses into one save
      this.app.saveConfigDebounced();
      this.isDirty = false;
    } else {
      this.isDirty = true;
    }

    // render map features
    this.renderMapContents(e.zoomChanged);
  }

  // pointer events
  protected onMapPointerMove(e: FBPointerEvent) {
    this.pointerSeen = true;
    this.mouse.set({
      pixel: e.pixel,
      xy: e.coordinate,
      coords: GeoUtils.normaliseCoords(e.lonlat as Position)
    });
    this.updateCursorInfo(e.lonlat as Position);
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
            // Keep the live measure label in the pointer's world copy (#572).
            worldOffset: e.worldOffset ?? 0,
            title: `${this.app.formatValueForDisplay(
              lm,
              'm'
            )} ${this.app.formatValueForDisplay(b, 'deg')}`
          });
        });
      } else if (
        this.mapInteract.measureGeometryType === 'BearingDistance' &&
        // A finger only moves to pan; on touch the target is placed by a tap.
        e.originalEvent?.pointerType !== 'touch'
      ) {
        this.mapInteract.followBearingDistance(
          GeoUtils.normaliseCoords(e.lonlat as Position),
          e.worldOffset ?? 0
        );
      }
    }
  }

  protected onMapPointerDrag() {
    this.onUserPan();
  }

  // The user is panning the chart — by pointer drag or by the arrow keys (#725).
  // Applies the "Map Pan When Following" setting; the only place its two flags
  // are written, so a new pan trigger cannot miss one of them.
  private onUserPan() {
    // A pan is the user, so it restarts the idle countdown — before the
    // follow-mode guard below, because every pan AFTER the one that released
    // follow mode arrives with follow already off and must still count (#714).
    this.refollow.reset();
    if (!this.app.uiConfig().mapMove) {
      return;
    }
    if (this.app.config.map.panBehavior === 'exit') {
      // pointer-drag runs outside the Angular zone (see MapComponent); re-enter
      // so exiting "move map" mode propagates to the UI. Rare one-off transition.
      this.ngZone.run(() => this.exitMovingMap.emit(true));
      // The pan that releases follow mode also starts the idle countdown that
      // brings it back (#714). Further pans and zooms restart it above.
      this.refollow.arm(this.app.config.map.refollowDelay);
    } else if (this.app.config.map.panBehavior === 'offset') {
      // Follow mode stays on; onMapMoveEnd() captures the new look-ahead once
      // the pan settles.
      this.userPanned = true;
    }
  }

  // Update the status-bar cursor bearing/distance/ETA readout. Off unless the
  // "Live ETA at cursor" option is enabled and the vessel position is known.
  // `fromTap` marks the one caller allowed to write while the readout is pinned
  // to a tapped point — the tap that is doing the pinning.
  private updateCursorInfo(cursor: Position, fromTap = false) {
    if (this.cursorPin.active && !fromTap) {
      return;
    }
    const vessel = this.app.data.vessels.self;
    if (
      !this.app.config.display.statusBar?.liveEta ||
      !vessel?.positionReceived ||
      !vessel.position
    ) {
      this.cursorInfo.set(null);
      return;
    }
    // referenceSpeed is stored in the user's display speed unit; convert to m/s.
    const factor =
      Convert.transform(1, 'm/s', this.app.config.units.speed as TARGET_UNIT) ??
      1;
    const refSpeed = this.app.config.display.statusBar.referenceSpeed;
    const referenceSpeedMs =
      factor > 0 && typeof refSpeed === 'number' ? refSpeed / factor : 0;
    this.cursorInfo.set(
      computeCursorEta(vessel.position, cursor, vessel.sog, referenceSpeedMs)
    );
  }

  /**
   * Hold the readout on a tapped point and mark it on the chart. Skipped for a
   * hold (the context-menu gesture) so only a deliberate tap measures.
   */
  private pinCursorAtTap(position: Position, worldOffset: number) {
    if (
      !this.app.config.display.statusBar?.liveEta ||
      Date.now() - this.pointerDownAt > TAP_MAX_DURATION
    ) {
      return;
    }
    this.pinMap.set(this.clickMap);
    this.cursorPin.pin(
      position,
      worldOffset,
      tapFadeMs(this.app.config.display.statusBar.tapFadeSpeed)
    );
    this.updateCursorInfo(position, true);
  }

  protected onMapPointerDown(e: FBPointerDownEvent) {
    this.pointerDownAt = Date.now();
    this.pointerSeen = true;
    // A finger raises no pointer moves before it drags, so the press is the
    // only position a long-press has: record all of it, as a move would.
    this.mouse.set({
      pixel: e.pixel,
      xy: e.coordinate,
      coords: GeoUtils.normaliseCoords(e.lonlat as Position)
    });
    // A map press is the raw DOM pointerdown event, not an OL MapBrowserEvent,
    // so the pointer position is on the event itself.
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
  }

  protected onMapSingleClick(e: FBClickEvent, map?: OlMap) {
    this.clickMap = map;
    // Remember which world copy this click landed in so any popover it opens is
    // drawn there, and the raw world-aware x so a route edit aligns with it (#572).
    this.clickWorldOffset = e.worldOffset ?? 0;
    this.clickMercX = fromLonLat(e.lonlat)[0] + this.clickWorldOffset;
    this.app.data.map.atClick = {
      features: e.features,
      overlayHits: e.overlayHits,
      lonlat: e.lonlat
    };
    if (this.mapInteract.pick()) {
      this.selectForPick(e);
    } else if (this.mapInteract.isMeasuring()) {
      // measuring
      if (this.mapInteract.measureGeometryType === 'BearingDistance') {
        this.bearingMap.set(map);
        this.mapInteract.placeBearingDistancePoint(
          GeoUtils.normaliseCoords(e.lonlat),
          this.clickWorldOffset
        );
      } else {
        this.parseClickInMeasureMode(e.lonlat);
      }
    } else if (
      // drawing
      this.mapInteract.isDrawing() &&
      this.mapInteract.draw.resourceType === 'route'
    ) {
      this.onDrawClick();
    } else if (
      // modifying a route: a click in open water extends it from the end
      this.mapInteract.isModifying() &&
      this.mapInteract.draw.resourceType === 'route'
    ) {
      this.extendRouteInModify(e);
    } else if (
      //not interacting, a guard zone edit included
      !this.mapInteract.isDrawing() &&
      !this.mapInteract.isModifying() &&
      !this.zoneEdit.edit()
    ) {
      if (!this.app.config.map.popoverMulti) {
        this.popoverClosed();
      }
      this.processMapClick(e);
      this.pinCursorAtTap(e.lonlat, e.worldOffset ?? 0);
    }
  }

  /**
   * A primary select during a pick (capability `map.pick`): the first
   * feature under the pointer the pick accepts, or the point, ends it and
   * does nothing else. A select it accepts nothing at leaves it on.
   */
  private selectForPick(e: FBClickEvent) {
    const pick = this.mapInteract.pick();
    if (!pick) return;
    const at = GeoUtils.normaliseCoords(e.lonlat as Position);
    const target = pickedTarget(
      pick.rules,
      this.targetsAt(e.features, e.overlayHits, at),
      positionTarget(at),
      pick.extension
    );
    if (target) {
      this.mapInteract.endPick(pick.pickId, { target });
    }
  }

  /** Handle right click / touch hold */
  protected onMapRightClick(
    e: Omit<FBRightClickEvent, 'worldOffset'> & { worldOffset?: number },
    map?: OlMap
  ) {
    this.clickMap = map;
    // toLonLat() gives [lon, lat]
    const lonlat = e.lonlat as Position;
    this.clickWorldOffset = e.worldOffset ?? 0;
    this.clickMercX = fromLonLat(lonlat)[0] + this.clickWorldOffset;
    this.app.data.map.atClick = {
      features: e.features,
      overlayHits: e.overlayHits,
      lonlat
    };
    this.app.debug(`onRightClick()`, this.app.data.map.atClick);
    if (this.mapInteract.isMeasuring()) {
      this.parseClickInMeasureMode(lonlat);
    }
  }

  /** Handle Map context menu event */
  protected onMapContextMenu(e: PointerEvent) {
    this.app.debug(`onMapContextMenu()`, this.app.data.map.atClick);
    this.onContextMenu(e);
  }

  /**
   * The pointer over the second pane moves the position readout and its
   * bearing and distance: the pixel and map coordinate stay this chart's, for
   * its own menu.
   */
  private onSecondaryPointer(lonlat: Position) {
    this.pointerSeen = true;
    const coords = GeoUtils.normaliseCoords(lonlat);
    this.mouse.update((mouse) => ({ ...mouse, coords }));
    this.updateCursorInfo(coords);
  }

  /**
   * A tap or menu request on the split view's second pane. Its layers mirror
   * this chart's, so its features are this chart's own and are handled here.
   */
  private onSecondaryTap(tap: SecondaryTap) {
    // A finger on the second pane raises no pointer move before the tap.
    this.onSecondaryPointer(
      tap.kind === 'click' ? tap.event.lonlat : (tap.lonlat as Position)
    );
    if (tap.kind === 'click') {
      this.pointerDownAt = tap.pressedAt;
      this.onMapSingleClick(tap.event, tap.map);
    } else {
      const at = GeoUtils.normaliseCoords(tap.lonlat as Position);
      // No menu, no move: leave the tap where it was.
      if (!this.contextMenuContent(tap.features, tap.overlayHits, at)) {
        return;
      }
      this.onMapRightClick(tap, tap.map);
      this.onContextMenu(tap.event, at, tap.zoom);
    }
  }

  /**
   * Handle ol-map container context menu event
   * @param at Where the menu acts, when not where the pointer is over this
   * chart (a long press on the split view's second pane)
   */
  protected onContextMenu(e: MouseEvent, at?: Position, zoom?: number) {
    this.app.debug(`onContextMenu()`, this.app.data.map.atClick);
    this.menuZoom.set(zoom ?? this.mapZoomLevel());
    if (!at && !this.mouse().xy) {
      return;
    }
    const where = at ?? this.mouse().coords;
    const content = this.contextMenuContent(
      this.app.data.map.atClick?.features ?? [],
      this.app.data.map.atClick?.overlayHits ?? [],
      where
    );
    if (!content) {
      return;
    }
    const { host, ext } = content;
    e.preventDefault();
    this.contextMenuPosition.x = e.clientX + 'px';
    this.contextMenuPosition.y = e.clientY + 'px';
    // Resolve the click to an empty widget-anchor cell (desktop right-click
    // equivalent of the press-and-hold add gesture). Null when not over one.
    this.addableWidgetCell = host
      ? this.plotterExt.addableCellAt(e.clientX, e.clientY)
      : null;
    this.contextMenu.menuData = { item: where, host, ext };
    this.contextMenu.openMenu();
    document
      .getElementsByClassName('cdk-overlay-backdrop')[0]
      .addEventListener('contextmenu', (offEvent) => {
        offEvent.preventDefault(); // prevent default context menu for overlay
        this.contextMenu.closeMenu();
      });
  }

  /**
   * What a context menu at `at` shows, or null when none opens. Freeboard's
   * own items are left out where they always were: in kiosk mode, over an
   * open popover, and while drawing, measuring, modifying or box-selecting,
   * which suppress them (the measure point is added by onMapRightClick,
   * which fires alongside the menu). Extension actions are offered at every
   * point, position actions included, except during a modal interaction.
   * During a pick no menu opens at all.
   */
  private contextMenuContent(
    features: FeatureLike[],
    overlayHits: OverlayHit[],
    at: Position
  ): {
    host: boolean;
    ext: Array<{ target: ChartTarget; actions: UsableAction[] }>;
  } | null {
    if (this.modifyMode) {
      return null;
    }
    const host =
      !this.app.uiCtrl().suppressContextMenu &&
      !this.overlay().show &&
      !this.mapInteract.pick();
    const ext = this.isModalInteraction()
      ? []
      : this.extensionActionGroups(features, overlayHits, at);
    return host || ext.length ? { host, ext } : null;
  }

  /**
   * Whether the user is in a modal interaction — drawing, measuring, editing
   * geometry or a guard zone, box-selecting, picking — during which no
   * extension action is offered.
   */
  private isModalInteraction(): boolean {
    return (
      !!this.mapInteract.pick() ||
      this.mapInteract.isDrawing() ||
      this.mapInteract.isMeasuring() ||
      this.mapInteract.isModifying() ||
      this.mapInteract.isBoxSelecting() ||
      !!this.zoneEdit.edit()
    );
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
    const c = toLonLat(e.coordinate);
    this.mapInteract.initBoxCoord(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxEnd(e: DragBoxEvent) {
    const c = toLonLat(e.coordinate);
    this.mapInteract.stopBoxSelection(c as Position);
  }

  /** Handle OL interaction end event */
  protected onDragBoxCancel() {
    this.app.debug(`onDragBoxCancel()...`);
    this.mapInteract.stopBoxSelection();
  }

  /** Handle OL interaction start event */
  protected onMeasureStart(e: DrawEvent) {
    this.app.debug(`onMeasureStart()...`, this.mapInteract.measureGeometryType);
    let c = (e.feature.getGeometry() as OLLineString)
      .getCoordinates()
      .map((c) => toLonLat(c) as Position);
    c = c.slice(0, c.length - 1);
    this.mapInteract.measurementCoords = c;
    const ovPosition: LineString = c;
    this.popoverClosed();
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
    this.popoverClosed();
    this.mapInteract.stopMeasuring();
  }

  /** Handle OL interaction start event */
  protected onDrawStart(e: DrawEvent) {
    this.drawSketch = e.feature;
  }

  /**
   * Process pointer click in DRAW mode. The read-out is taken from the sketch
   * itself, since the features under the click include other routes, tracks
   * and chart lines.
   */
  protected onDrawClick() {
    if (this.mapInteract.draw.resourceType !== 'route') {
      return;
    }
    const geom = this.drawSketch?.getGeometry();
    if (!(geom instanceof OLLineString)) {
      return;
    }
    // The sketch's last coordinate is OL's floating cursor point.
    const rteCoords = geom
      .getCoordinates()
      .slice(0, -1)
      .map((c) => toLonLat(c) as Position);
    this.mapInteract.measurementCoords = rteCoords;
  }

  /**
   * Complete the in-progress draw sketch (as a double-click would), so a
   * "Finish" button can end a route draw. A no-op until the sketch has enough
   * points; OL then dispatches drawend → onDrawEnd through the normal path.
   */
  finishDrawing() {
    this.routeDraw?.finishDrawing();
  }

  /**
   * Undo the last action in the active route interaction (#542): while drawing,
   * remove the last placed point (repeatable back to the first); while
   * modifying, revert the last vertex operation from the session undo stack.
   */
  undoInteraction() {
    if (this.mapInteract.isDrawing()) {
      this.undoDrawPoint();
    } else if (this.mapInteract.isModifying()) {
      this.undoModify();
    }
  }

  /** Remove the last point placed in the current route draw sketch. */
  private undoDrawPoint() {
    this.routeDraw?.removeLastPoint();
    // Keep the distance read-out in step: the sketch just lost its last placed
    // point (the floating cursor point is excluded from measurement coords).
    const coords = this.mapInteract.measurement().coords;
    this.mapInteract.measurementCoords = coords.slice(
      0,
      Math.max(0, coords.length - 1)
    );
  }

  /** Revert the last vertex operation of the current route Modify session. */
  private undoModify() {
    const snap = this.mapInteract.popModifyUndo();
    if (!snap) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = this.mapInteract.draw.features?.getArray()[0];
    const forSave = this.mapInteract.draw.forSave;
    if (!f || !forSave) {
      return;
    }
    // Capture the geometry before it is replaced: diffed against the restored
    // coordinates it tells the Leg read-out which vertex the undo puts back
    // (#581).
    const undone = f.getGeometry().getCoordinates() as Position[];
    // setCoordinates fires the feature's 'change' event; the active OL Modify
    // interaction listens for it (handleFeatureChange_) and rebuilds its
    // segment/vertex index whenever the geometry changes outside its own drag
    // (changingFeature_ is false here), so the next drag targets the restored
    // vertices — no manual re-sync of the interaction is needed.
    f.getGeometry().setCoordinates(snap.coordinates);
    // Restore per-point metadata on the feature too: updateCoordsMeta mutates
    // pointMetadata in place, and the next modifystart re-reads it from the
    // feature — so without this a later edit would splice a stale, wrong-length
    // metadata array.
    f.set('pointMetadata', snap.coordsMetadata ?? null);
    // Re-baseline session state to the restored geometry so the next op (and a
    // subsequent Finish/Cancel) sees the reverted route.
    this.mapInteract.draw.coordinates = snap.coordinates;
    forSave.coordsMetadata = snap.coordsMetadata;
    const pc = this.transformCoordsArray(snap.coordinates) as LineString;
    forSave['coords'] = pc;
    this.mapInteract.measurementCoords = pc;
    this.mapInteract.measurementIndex = modifiedLegIndex(
      undone,
      snap.coordinates
    );
  }

  /** Handle OL interaction end event */
  protected onDrawEnd(e: { feature: Feature }) {
    // Link the points snapped onto waypoints while the sketch is still in
    // render space, where a snapped point lies exactly on its waypoint (#881).
    const geom = e.feature?.getGeometry();
    const map = this.olMap.getMap();
    if (
      map &&
      this.mapInteract.draw.resourceType === 'route' &&
      geom instanceof OLLineString
    ) {
      this.mapInteract.draw.coordsMetadata = drawnRouteMeta(
        geom.getCoordinates() as Position[],
        drawnWaypoints(map),
        this.waypointLookup
      );
    }
    // OL dispatches drawend synchronously from the map's viewport pointer
    // handlers, which run outside the Angular zone (see MapComponent). Re-enter
    // the zone so the save prompt / live-edit draft opened via
    // drawEnded -> handleDrawEnded gets a change-detection pass.
    this.ngZone.run(() => {
      this.mapInteract.stopDrawing(e.feature);
      this.drawEnded.emit(this.mapInteract.draw);
    });
  }

  /** Enter modify mode */
  /** Convert a live route edit buffer to the FBRoute tuple fb-routes renders. */
  /** The route buffer for `routeId` only when it represents an unsaved draft or
   *  a route with pending edits. The registry now also mirrors clean saved
   *  routes, so a plain `routeBuffers.has()` would wrongly treat those as
   *  unsaved. */
  private getUnsavedRouteBuffer(routeId: string): RouteBuffer | undefined {
    const b = this.routeBuffers.get(routeId);
    return b && (!b.saved || b.dirty) ? b : undefined;
  }

  private bufferToFBRoute(b: RouteBuffer): FBRoute {
    const rte = new SKRoute();
    rte.name = b.name ?? '';
    rte.description = b.description ?? '';
    rte.feature.geometry.coordinates = b.points.map(
      (p) => p.position
    ) as LineString;
    // Carry per-point metadata so editing a named draft (which seeds
    // coordsMetadata from the rendered feature's pointMetadata) doesn't drop
    // point names/descriptions or waypoint links on save.
    const coordsMeta = coordinatesMetaFromPoints(b.points);
    if (coordsMeta && rte.feature.properties) {
      rte.feature.properties.coordinatesMeta = coordsMeta;
    }
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);
    return [b.routeId, rte, true];
  }

  /** True when the popover's route is an unsaved draft (or has pending edits). */
  protected isUnsavedRoute(): boolean {
    const { id, type } = this.overlay();
    if (type !== 'route' || id === null) {
      return false;
    }
    const b = this.routeBuffers.get(id);
    return !!b && (!b.saved || b.dirty);
  }

  /** True when REVERSE can turn the popover's route round. */
  protected canReverseRoute(): boolean {
    const { id, type } = this.overlay();
    return (
      type === 'route' && id !== null && this.routeReverse.mode(id) !== null
    );
  }

  /** REVERSE in a route's popover. The popover stays open, so a draft can be
   *  STARTed straight away. */
  protected reverseRoute() {
    const id = this.overlay().id;
    if (id !== null) {
      this.routeReverse.reverse(id);
    }
  }

  /** True when the popover's route was drawn and never saved. */
  protected isDraftRoute(): boolean {
    const { id, type } = this.overlay();
    if (type !== 'route' || id === null) {
      return false;
    }
    const b = this.routeBuffers.get(id);
    return !!b && !b.saved;
  }

  /**
   * Popover "Save" shortcut for an unsaved route — opens the standard Route
   * Details dialog (same path as the info-panel SAVE) and persists. Saves the
   * user a trip through INFO.
   */
  protected async saveRouteFromPopover() {
    const id = this.overlay().id;
    if (id === null) {
      return;
    }
    try {
      await this.plotterExt.saveBuffer(id, {
        dialog: true,
        promote: true
      });
    } catch {
      // saveBuffer surfaced the server error via parseHttpErrorResponse; the
      // buffer stays dirty so the user can retry.
    }
  }

  /**
   * @param at Where the feature was tapped, when no popover was opened for it
   * (a tap straight on the anchor)
   */
  protected modifyFeature(featureType?: string, at?: Position) {
    const features = this.mapInteract.draw.features;
    if (!features?.getLength()) {
      return;
    }
    if (at ? this.inPane(this.clickMap) : this.popoverPane()) {
      // Picked on the split view's second pane, but editing happens on this
      // chart: bring it to the feature first. The chart is centred in the
      // primary world, so align the edit with that world, not the pane's copy.
      // The buttons and keys now act on the chart being edited, close enough
      // in to show the feature as the pane did. First, so that leaving follow
      // mode hands the keys to this chart, not the pane.
      this.splitView.activate('main');
      if (this.movingMap) {
        this.exitMovingMap.emit(true);
      }
      const paneZoom = this.splitView.zoom();
      if (typeof paneZoom === 'number' && paneZoom > this.mapZoomLevel()) {
        this.mapZoomLevel.set(paneZoom);
        this.app.config.map.zoomLevel = paneZoom;
      }
      this.mapCenterPositon.set([...(at ?? this.overlay().position)]);
      this.clickMercX -= this.clickWorldOffset;
      this.clickWorldOffset = 0;
      this.clickMap = undefined;
    }
    // Align the edit feature with the world copy the user is looking at, so OL
    // Modify (which hit-tests raw geometry in view-space, ignoring wrapX) matches
    // where they click. A route's own coordinates may be unwrapped past ±180, so
    // the click's world alone is wrong — align by the feature's extent centre:
    // the whole-world shift that puts the feature centre in the clicked world.
    // It's a whole-world translation, so wrapX still draws the feature in the same
    // place (visually transparent), no vertices are added, and the edited
    // coordinates normalise back to [-180,180] on save (#572).
    const editGeom = (features.getArray()[0] as Feature)?.getGeometry();
    if (editGeom) {
      const ext = editGeom.getExtent();
      const centreX = (ext[0] + ext[2]) / 2;
      const shift = worldCopyOffset(
        this.clickMercX - centreX,
        WORLD_WIDTH_3857
      );
      if (shift) {
        features.forEach((f: Feature) => f.getGeometry()?.translate(shift, 0));
      }
    }
    this.mapInteract.startModifying(this.overlay());
    const rid = this.overlay().id;
    if (this.overlay().type === 'route' && rid !== null) {
      // Route name for the helper title ("Modify <name>"). An unnamed draft
      // resolves to the "(unsaved)" placeholder from formatPopover(), which we
      // keep on purpose so the title reads "Modify (unsaved)" — a deliberate
      // signal that the route has not been saved.
      const res = this.overlay().resource;
      this.mapInteract.draw.name = Array.isArray(res)
        ? ((res[1] as SKRoute)?.name ?? '')
        : '';
      this.mapInteract.measurementCoords = this.routeBuffers.has(rid)
        ? (this.routeBuffers
            .get(rid)!
            .points.map((p) => p.position) as LineString)
        : (this.skres.fromCache('routes', rid)?.[1].feature.geometry
            .coordinates ?? []);
    }
    const forSave = this.mapInteract.draw.forSave;
    if (featureType === 'anchor' && forSave) {
      this.overlay().type = featureType;
      forSave.id = featureType;
    }
  }

  /** Handle OL modify start event */
  protected onModifyStart(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    const forSave = this.mapInteract.draw.forSave;
    if (!forSave) {
      return;
    }
    this.mapInteract.draw.coordinates = f.getGeometry().getCoordinates();
    if (!forSave.id) {
      // initialise save info
      forSave.id = f.getId();
    }
    if (f.getGeometry().getType() === 'LineString') {
      const meta = f.get('pointMetadata');
      if (meta) {
        forSave.coordsMetadata = meta;
      }
    }
  }

  /** Handle OL modify end event */
  protected onModifyEnd(e: ModifyEvent) {
    // Modify interactions dispatch modifyend synchronously from the map's
    // viewport pointer handlers, which run outside the Angular zone (see
    // MapComponent). Re-enter the zone so the post-modify UI (the route-editing
    // toolbar driven by app.data.activeRouteIsEditing / editingId) gets a
    // change-detection pass.
    this.ngZone.run(() => this.applyModifyEnd(e));
  }

  private applyModifyEnd(e: ModifyEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = e.features.getArray()[0];
    const forSave = this.mapInteract.draw.forSave;
    if (!forSave) {
      return;
    }
    const fid = f.getId();
    const c = f.getGeometry().getCoordinates();
    // Snapshot the pre-operation route geometry so this vertex op (move / add /
    // delete) can be undone within the current Modify session (#542).
    // draw.coordinates holds the geometry as it was at modifystart;
    // coordsMetadata is mutated in place by updateCoordsMeta below, so clone it
    // now.
    if (fid.split('.')[0] === 'route') {
      const meta = forSave.coordsMetadata as RoutePointMeta[] | undefined;
      this.mapInteract.pushModifyUndo({
        coordinates: (this.mapInteract.draw.coordinates as Position[]).map(
          (co) => [...co] as Position
        ),
        coordsMetadata: meta ? meta.map((m) => ({ ...m })) : undefined
      });
    }
    if (f.getGeometry().getType() === 'LineString') {
      this.updateCoordsMeta(
        this.mapInteract.draw.coordinates as Coordinate[],
        c,
        forSave.coordsMetadata
      );
      if (fid.split('.')[0] === 'route') {
        this.linkModifiedPoint(
          f,
          forSave,
          this.mapInteract.draw.coordinates as Position[],
          c
        );
      }
      // The metadata is the feature's own pointMetadata, changed in place, so
      // nothing re-renders for it: the route and waypoint layers both style
      // from it (#991).
      f.changed();
    }
    let pc: DrawFeatureSaveInfo['coords'];
    if (fid.split('.')[0] === 'route') {
      pc = this.transformCoordsArray(c);
      this.mapInteract.measurementCoords = pc;
      // Report the leg ending at the vertex just moved rather than whatever the
      // last leg happens to be (#581). draw.coordinates still holds the geometry
      // as it was at modifystart, so it is the pre-operation side of the diff.
      this.mapInteract.measurementIndex = modifiedLegIndex(
        this.mapInteract.draw.coordinates as Position[],
        c as Position[]
      );
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
      pc = toLonLat(c) as Position;
      // shift anchor
      if (fid === 'anchor') {
        this.anchor.setAnchorPosition(pc)?.catch((err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        });
      }
    }
    forSave['coords'] = pc;
    if (
      this.app.data.activeRoute &&
      forSave.id?.includes(this.app.data.activeRoute)
    ) {
      this.app.data.activeRouteIsEditing = true;
    } else {
      this.app.data.activeRouteIsEditing = false;
    }
    this.app.data.editingId = forSave.id;

    this.app.debug(forSave);
  }

  /**
   * Extend the route being modified by appending a clicked open-water point as
   * the new end point (issue #549) — so a route can be lengthened the same way
   * it is drawn, without leaving modify mode. A click *on* the route belongs to
   * OL Modify (move / insert / delete a vertex), so only clicks that miss it
   * extend the route — and never the click that completes a vertex delete
   * (#608); the state kept in sync here mirrors applyModifyEnd so Undo, Finish
   * and Cancel all see the new point.
   */
  private extendRouteInModify(e: FBClickEvent) {
    const f = this.mapInteract.draw.features?.getArray()[0] as Feature;
    const geom = f?.getGeometry();
    const forSave = this.mapInteract.draw.forSave;
    const map = this.olMap.getMap();
    if (!f || geom?.getType() !== 'LineString' || !forSave || !map) {
      return;
    }
    const line = geom as OLLineString;
    // A click within the modify hit tolerance of the route itself is OL Modify's
    // (a vertex move / insert / delete); only a genuine miss extends the route.
    // Use a tolerance >= Modify's own pixelTolerance (OL default 10) so no single
    // click both inserts a vertex and appends an end point. getFeaturesAtPixel is
    // world-copy aware, matching what the user sees under wrapX.
    const tol = hitToleranceForPointer(e.originalEvent?.pointerType, 10, 15);
    const onRoute = map
      .getFeaturesAtPixel(e.pixel, { hitTolerance: tol })
      .some((ft) => ft.getId() === f.getId());
    // A delete has already moved the line away from the clicked pixel, so the
    // hit-test above cannot recognise the release that completed it (#608).
    if (
      !shouldExtendRoute({
        onRoute,
        vertexDeleted: vertexDeleted(map)
      })
    ) {
      return;
    }
    // Metadata may not be seeded yet if this is the first op of the session (no
    // modifystart has run) — read it from the feature, matching onModifyStart.
    let meta = forSave.coordsMetadata as RoutePointMeta[] | undefined;
    if (!meta) {
      const fm = f.get('pointMetadata');
      meta = Array.isArray(fm) ? fm : undefined;
    }

    // A click near a waypoint appends the waypoint itself (#881).
    const snap = waypointSnapAt(map, e.pixel, e.originalEvent?.pointerType);
    const ext = line.getExtent();
    const result = extendRouteAtClick(
      line.getCoordinates() as Position[],
      meta,
      (snap?.coordinate ?? fromLonLat(e.lonlat)) as Position,
      ext[0],
      ext[2]
    );
    result.meta = linkPointOnWaypoint(
      result.after,
      result.after.length - 1,
      result.meta,
      drawnWaypoints(map),
      this.waypointLookup
    );

    // Snapshot the pre-append state so the extension can be undone within the
    // session (#542), mirroring applyModifyEnd.
    this.mapInteract.pushModifyUndo(result.undo);
    line.setCoordinates(result.after);
    // Mirror the length-aligned metadata onto the feature so the next
    // modifystart re-reads a correct-length array.
    if (result.meta) {
      f.set('pointMetadata', result.meta);
    }

    if (!forSave.id) {
      forSave.id = f.getId() as string;
    }
    forSave.coordsMetadata = result.meta;
    this.mapInteract.draw.coordinates = result.after;
    const pc = this.transformCoordsArray(result.after) as LineString;
    forSave['coords'] = pc;
    this.mapInteract.measurementCoords = pc;
    this.mapInteract.measurementIndex = modifiedLegIndex(
      result.undo.coordinates,
      result.after
    );

    this.app.data.activeRouteIsEditing =
      !!this.app.data.activeRoute &&
      forSave.id.includes(this.app.data.activeRoute);
    this.app.data.editingId = forSave.id;
  }

  /** Name and description of a waypoint shown on the map. */
  private waypointLookup: WaypointLookup = (id) =>
    this.skres.fromCache('waypoints', id)?.[1];

  /**
   * Link the point a Modify operation moved or inserted to the waypoint it was
   * dropped on (#881). `before` and `after` are the route's render-space
   * geometry either side of the operation.
   */
  private linkModifiedPoint(
    f: Feature,
    forSave: DrawFeatureSaveInfo,
    before: Position[],
    after: Position[]
  ) {
    const map = this.olMap.getMap();
    if (!map) {
      return;
    }
    const meta = forSave.coordsMetadata as RoutePointMeta[] | undefined;
    const linked = linkPointOnWaypoint(
      after,
      touchedVertex(before, after),
      meta,
      drawnWaypoints(map),
      this.waypointLookup
    );
    if (linked !== meta) {
      // The route had no metadata: keep the new array on the feature too, so
      // the next modifystart reads it back.
      forSave.coordsMetadata = linked;
      f.set('pointMetadata', linked);
    }
  }

  /** The active route's point `index`, counted in the order it is followed. */
  private activeRoutePoint(index: number): ActiveRoutePoint {
    const c = this.course.courseData();
    // Point names are in the order the route is stored.
    const stored = followedPointIndex(
      index,
      c.pointTotal,
      this.app.data.activeRouteReversed
    );
    return {
      index,
      total: c.pointTotal,
      name: c.pointNames?.[stored] || undefined,
      position: c.activeRoutePoints?.[stored],
      isNext: index === c.pointIndex
    };
  }

  /** Whether the active route has edits not yet saved to the server, whose
   *  point order the Course API follows. */
  private activeRouteHasUnsavedEdits(): boolean {
    return (
      !!this.activeRoute &&
      editsRouteBuffer(this.routeBuffers.getForRoute(this.activeRoute))
    );
  }

  /**
   * The point of the active route a click picked, counted in the order the
   * route is being followed; null for a click on a leg, on another route, or
   * on the active route while it has unsaved edits (its points on screen may
   * not be the server's).
   */
  private activeRoutePointAt(
    e: FBClickEvent,
    feature: Feature,
    routeId: string
  ): number | null {
    const geometry = feature.getGeometry();
    if (
      !this.activeRoute ||
      routeId !== this.activeRoute ||
      !(geometry instanceof OLLineString) ||
      this.activeRouteHasUnsavedEdits()
    ) {
      return null;
    }
    const resolution = e.map.getView().getResolution();
    if (resolution === undefined) {
      return null;
    }
    const coordinates = geometry.getCoordinates();
    const candidates = pickRoutePoints(
      coordinates,
      e.coordinate,
      resolution,
      e.originalEvent?.pointerType === 'touch'
        ? ROUTE_POINT_PICK_PX.touch
        : ROUTE_POINT_PICK_PX.mouse,
      WORLD_WIDTH_3857
    );
    if (!candidates.length) {
      return null;
    }
    return preferredRoutePoint(
      candidates.map((i) =>
        followedPointIndex(
          i,
          coordinates.length,
          this.app.data.activeRouteReversed
        )
      ),
      this.course.courseData().pointIndex
    );
  }

  /** Process pointer click in non-interaction mode */
  private processMapClick(e: FBClickEvent) {
    this.s57Features = {};
    this.s57FeatureLikes = {};
    this.trackHistoryFeatures = {};
    this.overlayFeatures = {};
    const featureList: Map<string, FeatureListEntry> = new Map(); // features under pointer
    const chartBoundsFeatures: Map<string, FeatureListEntry> = new Map(); // chart bounds under pointer
    const fa: Feature[] = []; // features that can be the target of modify interaction
    let maskPopover = false; // suppress popover display

    // Selectable data-overlay features join the list where they were hit.
    // One that none of its extension's actions applies to is passed over, so
    // the click goes to whatever lies beneath it.
    const overlays = this.overlayTargets(
      e.overlayHits ?? [],
      GeoUtils.normaliseCoords(e.lonlat)
    ).filter((o) => this.plotterExt.actionsFor(o.target).length > 0);
    let nextOverlay = 0;
    const listOverlaysAbove = (i: number) => {
      while (
        nextOverlay < overlays.length &&
        overlays[nextOverlay].above <= i
      ) {
        const { target } = overlays[nextOverlay++];
        const t = target.target as OverlayFeatureTarget;
        const id = `${OVERLAY_FEATURE_ENTRY}${target.owner}/${t.overlayId}\n${t.source}\n${typeof t.featureId}:${t.featureId}`;
        this.overlayFeatures[id] = target;
        featureList.set(id, {
          id,
          coord: e.lonlat,
          icon: { name: 'extension', svgIcon: undefined },
          text: target.label
        });
      }
    };

    // process list of features at click location
    e.features.forEach((feature: FeatureLike, i: number) => {
      listOverlaysAbove(i);
      let id = feature.getId() as string;
      let addToFeatureList = false;
      let aton: SKAtoN | undefined;
      let sar: SKSaR | undefined;
      let meteo: SKMeteo | undefined;
      let aircraft: SKAircraft | undefined;
      let vessel: SKVessel | undefined;
      let icon: AppIconDef | undefined;
      let text: string | undefined;
      if (id && typeof id === 'string') {
        const t = id.split('.');
        if (t[0] === 'chart-backdrop') {
          maskPopover = true;
          return;
        }
        if (t[0] === 'chart-bound') {
          chartBoundsFeatures.set(id, {
            id: t[1],
            coord: e.lonlat,
            icon: 'map',
            text: feature.get('name')
          });
        }
        switch (t[0]) {
          case 'rset':
            addToFeatureList = true;
            icon = {
              name: 'star',
              svgIcon: undefined
            };
            text = feature.get('name');
            break;
          case 'alarm':
            addToFeatureList = true;
            icon = {
              name: 'notification_important',
              svgIcon: undefined
            };
            text = `Alarm: ${feature.get('type')}`;
            break;
          case 'anchor':
            addToFeatureList = true;
            icon = {
              name: 'anchor',
              svgIcon: undefined
            };
            text = `${t[0]}`;
            break;
          case 'dest':
            addToFeatureList = true;
            icon = {
              name: 'flag',
              svgIcon: undefined
            };
            text = 'Destination';
            break;
          case 'note': {
            icon = {
              svgIcon: feature.get('icon'),
              name: undefined
            };
            const n = this.skres.fromCache('notes', t[1]);
            addToFeatureList = !!n;
            text = n?.[1].name ?? '';
            break;
          }
          case 'route': {
            const point = this.activeRoutePointAt(e, feature as Feature, t[1]);
            if (point !== null) {
              id = `rtept.${point}`;
              icon = {
                name: 'location_on',
                svgIcon: undefined,
                class: 'icon-route'
              };
              addToFeatureList = true;
              text =
                this.activeRoutePoint(point).name || `Route point ${point + 1}`;
              break;
            }
            icon = {
              svgIcon: 'route',
              name: undefined,
              class: 'icon-route'
            };
            const ub = this.getUnsavedRouteBuffer(t[1]);
            if (ub) {
              addToFeatureList = true;
              text = ub.name || 'Route (unsaved)';
            } else {
              const r = this.skres.fromCache('routes', t[1]);
              addToFeatureList = !!r;
              text = r?.[1].name;
            }
            break;
          }
          case 'waypoint': {
            icon = {
              name: 'location_on',
              svgIcon: undefined,
              class: 'icon-waypoint'
            };
            const w = this.skres.fromCache('waypoints', t[1]);
            addToFeatureList = !!w;
            text = w?.[1].name ?? '';
            break;
          }
          case 'atons':
          case 'aton':
          case 'shore':
            icon = {
              name: 'beenhere',
              svgIcon: undefined
            };
            addToFeatureList = true;
            aton = this.app.data.atons.get(id);
            text = aton ? aton.name || aton.mmsi : '';
            break;
          case 'sar':
            icon = {
              name: 'tour',
              svgIcon: undefined
            };
            addToFeatureList = true;
            sar = this.app.data.sar.get(id);
            text = sar ? sar.name || sar.mmsi : 'SaR Beacon';
            break;
          case 'meteo':
            icon = {
              name: 'air',
              svgIcon: undefined
            };
            addToFeatureList = true;
            meteo = this.app.data.meteo.get(id);
            text = meteo ? meteo.name || meteo.mmsi : 'Weather Station';
            break;
          case 'ais-vessels':
            icon = {
              name: 'directions_boat',
              svgIcon: undefined
            };
            addToFeatureList = true;
            vessel = this.dfeat.ais.get(`vessels.${t[1]}`);
            text = vessel ? vessel.name || vessel.mmsi : '';
            break;
          case 'vessels':
            icon = {
              name: 'directions_boat',
              svgIcon: undefined
            };
            addToFeatureList = true;
            text = this.dfeat.self.name
              ? this.dfeat.self.name + ' (self)'
              : 'self';
            break;
          case 'region':
            addToFeatureList = true;
            icon = {
              name: 'tab_unselected',
              svgIcon: undefined,
              class: 'icon-region'
            };
            text = feature.get('name');
            break;
          case 'aircraft':
            icon = {
              name: 'airplanemode_active',
              svgIcon: undefined
            };
            addToFeatureList = true;
            aircraft = this.app.data.aircraft.get(id);
            text = aircraft ? aircraft.name || aircraft.mmsi : '';
            break;
          case TRACK_HISTORY_ID:
            addToFeatureList = true;
            icon = {
              name: 'history',
              svgIcon: undefined
            };
            text = `Track history: ${this.trackHistory.label(feature.get('context'))}`;
            this.trackHistoryFeatures[id] = {
              context: feature.get('context'),
              lines: [feature.get('line')],
              times: feature.get('times') ? [feature.get('times')] : undefined,
              at: e.lonlat
            };
            break;
          case 'track': {
            // a stored track (a GPX import): its own name, and its point
            // times when it was stored with them
            const trk = this.skres.fromCache('tracks', t[1]) as
              FBTrack | undefined;
            if (trk) {
              const coordTimes = trk[1].feature.properties?.coordTimes;
              addToFeatureList = true;
              icon = { name: 'timeline', svgIcon: undefined };
              text = trk[1].name || 'Track';
              this.trackHistoryFeatures[id] = {
                context: 'track',
                name: text,
                lines: trk[1].feature.geometry.coordinates,
                times: Array.isArray(coordTimes) ? coordTimes : undefined,
                at: e.lonlat
              };
            }
            break;
          }
          case 'track-vessels': {
            // an AIS track from the v2 Track API says when the vessel was there
            const context = id.slice('track-'.length);
            const timed = this.app.aisTracksTimed().get(context);
            if (timed) {
              addToFeatureList = true;
              icon = { name: 'history', svgIcon: undefined };
              text = `Vessel track: ${this.trackHistory.label(context)}`;
              this.trackHistoryFeatures[id] = {
                context,
                lines: timed.lines,
                times: timed.times,
                at: e.lonlat
              };
            }
            break;
          }
          case 'trail': {
            // the server trail carries its recording times; the local trail,
            // the time each point was logged
            // the local trail carries on from the server trail, so both answer
            // from the two joined into one passage
            const timed =
              id === 'trail.self.server' || id === 'trail.self.local'
                ? trailTapTrack(
                    this.app.selfTrailTimed(),
                    this.app.selfTrailFromServer().length > 0,
                    this.app.localTrailTimed()
                  )
                : null;
            if (timed?.lines.length) {
              addToFeatureList = true;
              icon = { name: 'history', svgIcon: undefined };
              text = 'Vessel trail';
              this.trackHistoryFeatures[id] = {
                context: 'self',
                lines: timed.lines,
                times: timed.times,
                at: e.lonlat
              };
            }
            break;
          }
          case 'tidal':
            addToFeatureList = true;
            icon = {
              name: 'water',
              svgIcon: undefined
            };
            text = feature.get('name');
            this.tidalFeatures[id] = {
              speedKn: Number(feature.get('driftKts')) || 0,
              direction: Number(feature.get('setDeg')) || 0
            };
            break;
        }
      } else if (!id && feature.getProperties) {
        const props = feature.getProperties();
        // S57 features
        if (props['RCID'] && S57_CLICKABLE_LAYERS.has(props['layer'])) {
          id = `s57.${props['LNAM']}`;
          addToFeatureList = true;
          icon = {
            name: 'beenhere',
            svgIcon: undefined
          };
          text = S57_NAMES[props['layer']];
          this.s57Features[id] = props;
          this.s57FeatureLikes[id] = feature;
        }
      }

      if (addToFeatureList && !featureList.has(id)) {
        featureList.set(id, {
          id: id,
          coord: e.lonlat,
          icon: icon,
          text: text
        });
        fa.push(feature as Feature);
      }
    });
    listOverlaysAbove(Infinity);

    trackTimesHiddenByVessel(featureList.keys()).forEach((id) =>
      featureList.delete(id)
    );
    // The destination flag marks the route point being headed for; the route
    // point's own popover covers it and adds Skip.
    if ([...featureList.keys()].some((id) => id.startsWith('rtept.'))) {
      [...featureList.keys()]
        .filter((id) => id.startsWith('dest.'))
        .forEach((id) => featureList.delete(id));
    }
    // server and local trail are one trail, answered from the same data
    if (
      featureList.has('trail.self.server') &&
      featureList.has('trail.self.local')
    ) {
      featureList.delete('trail.self.local');
    }

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

  private s57Features: Record<string, Record<string, string | number>> = {};
  /** The data-overlay features listed after the last click, by entry id. */
  private overlayFeatures: Record<string, ChartTarget> = {};
  /** The S-57 features themselves, for a point feature's position. */
  private s57FeatureLikes: Record<string, FeatureLike> = {};
  private trackHistoryFeatures: Record<string, TrackHistoryFeature> = {};
  private wholeTrackSub?: Subscription;
  private passageSub?: Subscription;
  private tidalFeatures: Record<
    string,
    Pick<GridSample, 'speedKn' | 'direction'>
  > = {};

  // ******** POPOVER ACTIONS ************

  /**
   * build popover for selected feature
   * @param id: feature id
   * @param coord Position to display the popover
   * @param featureList list of map features at the supplied position
   * */

  protected formatPopover(
    id: string,
    coord: Position,
    featureList?: Map<string, FeatureListEntry>
  ) {
    if (!id) {
      this.popoverClosed();
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
      // Draw the popover in the world copy the opening click landed in. position
      // stays canonical; this only shifts where it renders (#572).
      worldOffset: this.clickWorldOffset,
      readOnly: false,
      isSelf: false,
      target: this.popoverTarget(id, coord)
    };

    let item;
    const t = id.split('.');
    let aid: string;

    switch (t[0]) {
      case 'overlay-feature': {
        // a selectable data-overlay feature: its extension's default action
        // runs at once; without one, a popover offers its actions
        const target = poData.target;
        if (!target) return;
        const actions = this.plotterExt.actionsFor(target);
        const preferred = actions.find((a) => a.action.default === true);
        if (preferred) {
          this.popoverClosed();
          this.plotterExt.invokeAction(
            preferred.extension,
            preferred.action.id,
            target
          );
          return;
        }
        if (!actions.length) return;
        poData.id = id;
        poData.type = 'overlayFeature';
        poData.title = target.label;
        poData.readOnly = true;
        poData.show = true;
        break;
      }
      case 's57':
        poData.id = id;
        poData.title = 'S57 Feature';
        poData.type = 's57';
        poData.s57Feature = this.s57Features[id];
        poData.position = coord;
        poData.show = true;
        poData.readOnly = true;
        break;
      case 'anchor':
        this.modifyFeature('anchor', coord);
        return;
      case 'list':
        poData.type = t[0];
        poData.title = 'Features';
        poData.content = featureList ? [...featureList.values()] : [];
        poData.show = true;
        break;
      case 'chartlist':
        poData.type = t[0];
        poData.content = featureList ? [...featureList.values()] : [];
        poData.show = true;
        break;
      case 'alarm': {
        aid = id.split('.').slice(1).join('.');
        const alm = this.notiMgr.getAlert(aid);
        if (!alm) {
          return false;
        }
        poData.type = t[0];
        poData.alarm = alm;
        poData.id = aid;
        poData.show = true;
        break;
      }
      case 'vessels':
        poData.type = 'ais';
        poData.isSelf = true;
        poData.vessel = this.dfeat.self;
        poData.position = this.dfeat.self.position ?? coord;
        poData.show = true;
        break;
      case 'ais-vessels': {
        aid = id.slice(4);
        const vessel = this.dfeat.ais.get(aid);
        if (!vessel) {
          return false;
        }
        poData.type = 'ais';
        poData.id = aid;
        poData.vessel = vessel;
        poData.position = vessel.position ?? coord;
        poData.show = true;
        break;
      }
      case 'atons':
      case 'aton':
      case 'shore': {
        const aton = this.app.data.atons.get(id);
        if (!aton) {
          return false;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = aton;
        poData.position = aton.position ?? coord;
        poData.show = true;
        break;
      }
      case 'sar': {
        const sar = this.app.data.sar.get(id);
        if (!sar) {
          return false;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = sar;
        poData.position = sar.position ?? coord;
        poData.show = true;
        break;
      }
      case 'meteo': {
        const meteo = this.app.data.meteo.get(id);
        if (!meteo) {
          return false;
        }
        poData.type = t[0];
        poData.id = id;
        poData.aton = meteo;
        poData.position = meteo.position ?? coord;
        poData.show = true;
        break;
      }
      case 'aircraft': {
        const aircraft = this.app.data.aircraft.get(id);
        if (!aircraft) {
          return false;
        }
        poData.type = t[0];
        poData.id = id;
        poData.aircraft = aircraft;
        poData.position = aircraft.position ?? coord;
        poData.show = true;
        break;
      }
      case 'trail':
      case 'track':
      case 'track-vessels':
      case TRACK_HISTORY_ID: {
        const hf = this.trackHistoryFeatures[id];
        if (!hf) {
          return;
        }
        poData.id = id;
        poData.type = TRACK_HISTORY_ID;
        poData.position = coord;
        poData.show = true;
        poData.readOnly = true;
        const source = this.wholeTrackSource(t[0]);
        const whole =
          source && this.trackHistory.wholeTrack(source, hf.context);
        const trackHistory = this.trackPopover(hf);
        // a route read from a clipped track could stop at the edge of the
        // view, so it waits for the whole track; MAKE ROUTE is offered
        // meanwhile wherever the drawn track holds a passage
        poData.trackHistory = whole
          ? {
              ...trackHistory,
              route: undefined,
              routePending: trackHistory.route !== undefined
            }
          : trackHistory;
        this.showPopover(poData);
        this.loadWholeTrack(id, source, whole, hf);
        return;
      }
      case 'tidal': {
        const tf = this.tidalFeatures[id];
        poData.id = id;
        poData.type = 'tidal';
        poData.position = coord;
        poData.show = true;
        poData.readOnly = true;
        if (tf) {
          poData.tidal = {
            speedLabel: this.tidalCurrents.formatSpeed(tf.speedKn),
            directionLabel: `${this.app.formatValueForDisplay(tf.direction, 'deg', { precision: 0 })}T`
          };
        }
        break;
      }
      case 'region':
        item = this.skres.fromCache('regions', t[1]);
        if (!item) {
          return false;
        }
        poData.id = t[1];
        poData.type = t[0];
        poData.title = 'Region';
        poData.resource = item;
        poData.show = true;
        poData.readOnly = item[1]?.feature?.properties?.readOnly ?? false;
        if (this.infoPanel.opened()) {
          this.showPopover(poData);
          this.popoverInfo();
        }
        break;
      case 'note':
        item = this.skres.fromCache('notes', t[1]);
        if (!item) {
          return false;
        }
        poData.readOnly = item[1]?.properties?.readOnly ?? false;
        poData.id = t[1];
        poData.type = t[0];
        poData.title = 'Note';
        poData.resource = item;
        poData.show = true;
        // Single-click-to-details: skip the interim options popover and open the
        // Note details surface (info panel or dialog) straight away.
        if (this.app.config.display.singleClickNoteDetails) {
          poData.show = false;
          this.showPopover(poData);
          this.popoverInfo();
        } else if (this.infoPanel.opened()) {
          this.showPopover(poData);
          this.popoverInfo();
        }
        break;
      case 'route': {
        const ub = this.getUnsavedRouteBuffer(t[1]);
        if (ub) {
          // Unsaved live edit buffer (amber draft): build the popover from the
          // registry, not the saved-route cache. The popover header shows the
          // route name, so fall back to "(unsaved)" for an unnamed draft.
          const skr = this.bufferToFBRoute(ub)[1];
          skr.name = skr.name || '(unsaved)';
          poData.id = t[1];
          poData.type = 'route';
          poData.title = 'Route (unsaved)';
          poData.resource = [t[1], skr];
          poData.show = true;
          poData.readOnly = false;
        } else {
          item = this.skres.fromCache('routes', t[1]);
          if (!item) {
            return false;
          }
          poData.id = t[1];
          poData.type = t[0];
          poData.title = 'Route';
          poData.resource = item;
          poData.show = true;
          poData.readOnly = item[1]?.feature?.properties?.readOnly ?? false;
        }
        if (this.infoPanel.opened()) {
          this.showPopover(poData);
          this.popoverInfo();
        }
        break;
      }
      case 'waypoint':
        item = this.skres.fromCache('waypoints', t[1]);
        if (!item) {
          return false;
        }
        poData.id = t[1];
        poData.type = t[0];
        poData.resource = item;
        poData.title = 'Waypoint';
        poData.show = true;
        poData.readOnly = item[1]?.feature?.properties?.readOnly ?? false;
        if (this.infoPanel.opened()) {
          this.showPopover(poData);
          this.popoverInfo();
        }
        break;
      case 'rtept': {
        const index = Number(t[1]);
        poData.id = id;
        poData.type = 'rtept';
        poData.routePoint = this.activeRoutePoint(index);
        poData.title = poData.routePoint.name || 'Route point';
        poData.show = true;
        break;
      }
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
        poData.resourceSet = this.skresOther.fromResourceSetCache(
          id,
          true
        ) as IPopover['resourceSet'];
        poData.title =
          (poData.resourceSet as GeoJsonFeature)?.properties?.name ??
          'Resource Set';
        poData.show = poData.resourceSet ? true : false;
        break;
      default:
        return;
    }
    this.showPopover(poData);
  }

  /** Shows a popover on the chart the tap that opened it landed on. */
  private showPopover(popover: IPopover) {
    this.popoverMap.set(this.clickMap);
    this.overlay.set(popover);
  }

  /**
   * A popover opened from the one showing (a feature picked from a list, a
   * route made from a track) takes its place: on the pane it is on and in its
   * world copy, whatever has been tapped since.
   */
  private adoptPopoverTap() {
    const open = this.overlay();
    this.clickMap = this.popoverMap();
    this.clickWorldOffset = open.worldOffset ?? 0;
    this.clickMercX =
      fromLonLat(open.position as Position)[0] + this.clickWorldOffset;
  }

  /** handle selection from the FeatureList popover */
  protected featureListSelection(feature: FeatureListEntry) {
    // trim the draw.features collection to the selected feature.id
    const sf = new Collection<Feature>();
    this.mapInteract.draw.features?.forEach((e) => {
      if (e.getId() === feature.id) {
        sf.push(e);
      }
    });
    this.mapInteract.draw.features = sf;
    this.adoptPopoverTap();
    this.formatPopover(feature.id, feature.coord);
  }

  /** What a track popover shows for a tap on `hf`. */
  private trackPopover(hf: TrackHistoryFeature): TrackHistoryPopover {
    const info = trackTimeInfo(hf.lines, hf.times, hf.at);
    const label = (t: number) => chartTimeShortLabel(new Date(t).toISOString());
    return {
      name: hf.name ?? this.trackHistory.label(hf.context),
      start: info && label(info.start),
      end: info && label(info.end),
      duration: info && durationLabel(info.duration),
      at: info?.atTime !== undefined ? label(info.atTime) : undefined,
      route:
        hf.times &&
        trackSectionRoute(
          { lines: hf.lines, times: hf.times },
          hf.at,
          stopMs(hf.context)
        )
    };
  }

  /** Where the whole track of a vessel tapped on `layer` comes from: a
   * track fetched for the map view is clipped to it. Undefined for an own
   * trail kept only on this device. */
  private wholeTrackSource(
    layer: string
  ): 'history' | 'ais' | 'trail' | undefined {
    return layer === TRACK_HISTORY_ID
      ? 'history'
      : layer === 'track-vessels'
        ? 'ais'
        : layer === 'trail' && this.app.serverTrailWanted()
          ? 'trail'
          : undefined;
  }

  /** The popover opened from a clipped track is answered again from the
   * vessel's whole track: the passage, its times and its route then run on
   * past the edge of the view. The tapped point is carried over by its time,
   * since a vessel that crossed its own track would put another voyage
   * nearest the tapped position. A history range too long to come at route
   * detail is thinned by the provider; the route then waits for the passage
   * alone, asked for again. */
  private loadWholeTrack(
    id: string,
    source: 'history' | 'ais' | 'trail' | undefined,
    whole: Observable<HistoryTrack | undefined> | undefined,
    hf: TrackHistoryFeature
  ) {
    this.wholeTrackSub?.unsubscribe();
    this.passageSub?.unsubscribe();
    if (!whole) {
      return;
    }
    const atTime = trackTimeInfo(hf.lines, hf.times, hf.at)?.atTime;
    const onTrack = (
      track: HistoryTrack | undefined
    ): (TrackHistoryFeature & Pick<TimedTrack, 'times'>) | undefined => {
      if (!track?.times || this.overlay().id !== id || !this.overlay().show) {
        return undefined;
      }
      // the local trail carries on from the server trail, as when drawn
      const timed =
        source === 'trail'
          ? trailTapTrack(
              { lines: track.lines, times: track.times },
              true,
              this.app.localTrailTimed()
            )
          : { lines: track.lines, times: track.times };
      const at =
        (atTime !== undefined &&
          poseAt(timed.lines, timed.times, atTime)?.position) ||
        hf.at;
      return { ...hf, lines: timed.lines, times: timed.times, at };
    };
    // the route the popover waits for, made at once if MAKE ROUTE was chosen
    // while it loaded; none withdraws the offer
    const settleRoute = (route: Position[] | undefined) => {
      const open = this.overlay();
      const th = open.trackHistory;
      if (open.id !== id || !open.show || !th) {
        return;
      }
      this.overlay.set({
        ...open,
        trackHistory: {
          ...th,
          route,
          routePending: false,
          routeRequested: false
        }
      });
      if (th.routeRequested && route) {
        this.routeFromTrack();
      }
    };
    this.wholeTrackSub = whole.subscribe({
      next: (track) => {
        const tapped = onTrack(track);
        if (!tapped || !track) {
          settleRoute(undefined);
          return;
        }
        const trackHistory = this.trackPopover(tapped);
        const thinned =
          track.resolution !== undefined ||
          (track.epsilon ?? 0) > ROUTE_TOLERANCE_M;
        const span =
          (source === 'history' || source === 'trail') &&
          thinned &&
          trackHistory.route
            ? trackSectionSpan(
                { lines: tapped.lines, times: tapped.times },
                tapped.at,
                stopMs(hf.context)
              )
            : undefined;
        const passage =
          span && source
            ? this.trackHistory.wholeTrack(source, hf.context, {
                // the stops either side may lie a little beyond the thinned points
                from: span.from - stopMs(hf.context),
                to: span.to + stopMs(hf.context)
              })
            : undefined;
        this.overlay.update((o) => ({
          ...o,
          trackHistory: {
            ...trackHistory,
            route: undefined,
            routePending: o.trackHistory?.routePending,
            routeRequested: o.trackHistory?.routeRequested
          }
        }));
        if (!passage) {
          settleRoute(trackHistory.route);
          return;
        }
        this.passageSub = passage.subscribe({
          next: (detail) => {
            const tappedPassage = onTrack(detail);
            settleRoute(
              tappedPassage && this.trackPopover(tappedPassage).route
            );
          },
          error: () => settleRoute(undefined)
        });
      },
      // without the whole track the popover keeps what the drawn one shows,
      // and offers no route that could stop at the edge of the view
      error: () => settleRoute(undefined)
    });
  }

  /** MAKE ROUTE in a track popover: the passage it shows becomes a draft
   * route, opened as a drawn one is, to be started or saved. */
  protected routeFromTrack() {
    const th = this.overlay().trackHistory;
    if (th?.routePending) {
      // made when the whole track is in (loadWholeTrack)
      this.overlay.update((o) => ({
        ...o,
        trackHistory: { ...th, routeRequested: true }
      }));
      return;
    }
    if (!th?.route) {
      return;
    }
    const buffer = this.routeBuffers.create({
      name: `Track of ${th.name}`,
      points: th.route.map((position) => ({ position }))
    });
    if (this.app.useInfoPanel()) {
      this.popoverClosed();
      this.infoPanel.openWith('routes', this.bufferToFBRoute(buffer));
    } else {
      // the tapped track is no feature of the route: MODIFY would edit it
      this.mapInteract.draw.features = new Collection<Feature>();
      this.adoptPopoverTap();
      this.formatPopover(`route.${buffer.routeId}`, this.overlay().position);
    }
  }

  /** handle popover info event */
  protected popoverInfo() {
    const { id, type } = this.overlay();
    if (id === null || type === null) {
      return;
    }
    const collection = `${type}s` as SKResourceType;
    if (
      ['notes', 'regions', 'waypoints', 'routes'].includes(collection) &&
      this.app.useInfoPanel()
    ) {
      const ub = this.getUnsavedRouteBuffer(id);
      if (collection === 'routes' && ub) {
        // Unsaved live buffer: open the info panel directly from the registry
        // (it is not on the server, so infoPanel.open()'s fetch would fail).
        this.infoPanel.openWith('routes', this.bufferToFBRoute(ub));
      } else {
        this.infoPanel.open(collection, id);
      }
    } else {
      this.skres.resourceProperties({ id, type });
    }
  }

  /** Popover title for the Bearing & Distance measurement (#905). */
  protected bearingDistanceTitle(
    origin: Position | null,
    target: Position
  ): string {
    if (!origin) return '';
    const r = bearingDistanceReadout(origin, target);
    const fmt = (v: number, unit: SI_BASE_UNIT) =>
      this.app.formatValueForDisplay(v, unit);
    return `${fmt(r.distance, 'm')} ${fmt(r.bearing, 'deg')} (${fmt(r.reciprocal, 'deg')} recip)`;
  }

  /** Whether the notes layer is on, and either pane is zoomed in for notes. */
  protected notesShown(): boolean {
    return (
      this.app.config.ui.showNotes &&
      this.paneZoomMax() >= this.app.config.resources.notes.minZoom
    );
  }

  /** Layer properties that show a layer from `zoom` on, on each map. */
  protected shownFrom(zoom: number): { minZoom: number } {
    let gate = this.zoomGates.get(zoom);
    if (!gate) {
      gate = { minZoom: shownFromZoom(zoom) };
      this.zoomGates.set(zoom, gate);
    }
    return gate;
  }

  /** The placed Bearing & Distance target, dragged on this chart. */
  protected onBearingTargetDrag(position: Position, worldOffset: number) {
    this.bearingMap.set(undefined);
    this.mapInteract.moveBearingDistanceTarget(position, worldOffset);
  }

  /**
   * Hides the popover. The next one shown opens on this chart unless a tap on
   * the second pane opens it there.
   */
  protected popoverClosed() {
    this.popoverMap.set(undefined);
    this.overlay.update((current) => {
      return Object.assign({}, current, { show: false });
    });
  }

  private updateCoordsMeta(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startCoords: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endCoords: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: any[] | undefined
  ) {
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
      unlinkMovedPoints(
        startCoords,
        endCoords,
        meta,
        (href) =>
          this.skres.fromCache('waypoints', href.split('/').pop() ?? '')?.[1]
            ?.name
      );
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

  // Bound to the map element's keydown, so it only fires when the map has focus
  // (as OL's keyboard interactions do).
  // - +/-: routed through the same offset-preserving zoom as the on-screen
  //   buttons instead of OL zooming about the chart centre.
  // - Arrow keys: OL's keyboardpan interaction moves the view; it fires no
  //   pointerdrag, so apply the pan behaviour here or the "Map Pan When
  //   Following" setting is bypassed (#725).
  protected onMapKeydown(e: KeyboardEvent) {
    // Keys go to the chart that has focus, so it becomes the active pane; not
    // keys on its controls, as the zoom buttons act on the active pane.
    const controls = this.olMap?.getMap()?.getOverlayContainerStopEvent();
    if (!controls?.contains(e.target as Node)) {
      this.splitView.activate('main');
    }
    const direction = zoomKeyDirection(e);
    if (direction) {
      e.preventDefault();
      this.zoomMap(direction === 'in');
      return;
    }
    if (isPanKey(e)) {
      this.onUserPan();
    }
  }

  // handle map zoom controls
  protected zoomMap(zoomIn: boolean) {
    if (this.splitView.secondaryActive()) {
      this.splitView.zoomBy(zoomIn ? 1 : -1);
      return;
    }
    const { min, max } = this.app.MAP_ZOOM_EXTENT;
    const current = this.app.config.map.zoomLevel;
    const next = zoomIn
      ? Math.min(current + 1, max)
      : Math.max(current - 1, min);
    if (next === current) {
      return;
    }
    // Following with a screen offset: recompute the centre for the new zoom and
    // set it in the same update as the zoom, so the vessel keeps its on-screen
    // spot instead of zooming about the chart centre and snapping the offset
    // back on the next position fix.
    if (this.movingMap && !this.offsetSuppressed && !this.userPanned) {
      const offset = this.app.config.map.centerOffset;
      if (offset.x || offset.y) {
        this.mapCenterPositon.set(
          this.app.calcMapCenter(true, next - current, this.mapRotation())
        );
      }
    }
    this.mapZoomLevel.set(next);
    this.app.config.map.zoomLevel = next;
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
    if (this.userPanned) {
      // A pan is in flight under the 'offset' behavior: a position update
      // arriving mid-drag would snatch the chart back from the user.
      return;
    }
    // Resolve the offset against the rotation being applied in THIS render, not
    // the one move-end last reported. rotateMap() runs immediately before this
    // and only sets the local mapRotation signal; app.mapViewRotation is not
    // refreshed until OpenLayers renders and fires move-end. Using the stale
    // value leaves the vessel rotated about the screen centre by the per-update
    // heading change — invisible in north-up, where the rotation is always 0,
    // and a constant jitter in heading-up (#715).
    const pos = this.app.calcMapCenter(
      !this.offsetSuppressed,
      0,
      this.mapRotation()
    );
    this.mapCenterPositon.update(() => pos);
  }

  /**
   * Hold the vessel dead centre for a moment after follow mode is turned on
   * before easing out to the configured centre offset. A second tap of the
   * button inside that window therefore leaves the vessel exactly centred,
   * which is how "just centre it" is expressed now that one button does both.
   */
  private startOffsetGrace() {
    this.stopOffsetGrace();
    this.offsetSuppressed = true;
    this.centerVessel();
    this.offsetGraceTimer = setTimeout(() => {
      this.offsetSuppressed = false;
      this.centerVessel();
    }, OFFSET_GRACE_PERIOD);
  }

  private stopOffsetGrace() {
    clearTimeout(this.offsetGraceTimer);
    this.offsetGraceTimer = undefined;
    this.offsetSuppressed = false;
  }

  /** construct vessel lines for rendering */
  protected drawVesselLines(vesselUpdate = false) {
    const z = this.mapZoomLevel();
    const offset = z < 29 ? zoomOffsetLevel[Math.floor(z)] : 60;
    const wMax = 10; // max line length

    // update vessel trail
    const selfPosition = this.dfeat.self.position;
    if (vesselUpdate && selfPosition) {
      this.app.addToSelfTrail(selfPosition);
    }

    // render laylines
    this.buildLaylines();

    // render cog, heading, twd, awa for focused vessel
    this.vesselLines.update(() => {
      const cog = this.dfeat.active.vectors.cog ?? [];

      const sog = this.dfeat.active.sog || 0;
      const hl =
        this.app.config.vessels.selfLines.heading.length === -1
          ? (sog > wMax ? wMax : sog) * offset
          : Convert.nauticalMilesToKm(
              this.app.config.vessels.selfLines.heading.length
            ) * 1000;
      const position = this.dfeat.active.position;
      const heading: LineString = position
        ? [
            position,
            GeoUtils.rhumbDestination(
              position,
              this.dfeat.active.orientation,
              hl
            )
          ]
        : [];

      return {
        cog: cog,
        heading: heading
      };
    });
  }

  /** calculate vessel & dest laylines & update signals */
  private buildLaylines() {
    const input =
      this.app.config.vessels.laylines &&
      typeof (
        this.app.data.vessels.active.headingTrue ??
        this.app.data.vessels.active.headingMagnetic
      ) === 'number'
        ? laylineInput(
            this.app.data.vessels.active.position,
            this.dfeat.navData.position,
            this.app.data.vessels.self
          )
        : null;
    const laylines = input ? computeLaylines(input) : NO_LAYLINES;
    this.perfTargetAngle.set(laylines.targetAngle);
    this.perfLaylines.set({
      port: laylines.port,
      starboard: laylines.starboard
    });
  }

  // ********************

  // ** delete selected feature **
  protected async deleteFeature(id: string | null, type: string | null) {
    if (id === null) {
      return;
    }
    switch (type) {
      case 'waypoint':
        this.skres.deleteWaypoint(id);
        break;
      case 'route': {
        const b = this.routeBuffers.get(id);
        if (b && !b.saved) {
          // Unsaved draft — discard the live buffer locally.
          this.routeBuffers.delete(id);
        } else {
          // Saved route (clean or dirty, with or without a buffer) — delete the
          // stored resource by its href (a saved draft keeps its draft routeId),
          // and only drop the live buffer once the server delete is confirmed so
          // a cancel/failure doesn't lose it. hiddenSaved=false so the registry's
          // hidden event reports a permanent delete, not a hide.
          const ok = await this.skres.deleteRoute(b?.href ?? id);
          if (ok && b) {
            this.routeBuffers.delete(id, false);
          }
        }
        break;
      }
      case 'note':
        this.skres.deleteNote(id);
        break;
      case 'region':
        this.skres.deleteRegion(id);
        break;
    }
  }

  // ** hide a displayed feature (non-destructive; resource is untouched)
  protected hideFeature(id: string | null, type: string | null) {
    if (id !== null && type === 'route') {
      // Same effect as unchecking "Show on Map" in the Routes list — remove the
      // route from the displayed set; it reappears when re-selected there.
      this.skres.routeHide(id);
    }
  }

  // ** activate route / waypoint
  protected setActiveFeature() {
    const { id, type } = this.overlay();
    if (id === null) {
      return;
    }
    if (type === 'waypoint') {
      this.course.navigateToWaypoint(id);
    } else {
      this.activate.emit(id);
    }
  }

  // ** deactivate route / waypoint
  protected clearActiveFeature() {
    const id = this.overlay().id;
    if (id !== null) {
      this.deactivate.emit(id);
    }
  }

  // ** rejoin the active route at a point, or skip the one being headed for
  protected rejoinRouteAt(pointIndex: number) {
    this.course.rejoinRouteAt(pointIndex);
  }

  protected skipRoutePoint(pointIndex: number) {
    this.course.skipRoutePoint(pointIndex);
  }

  // ** emit info event **
  protected itemInfo(id: string | null, type: string | null, isSelf = false) {
    if (type === 'ais' && isSelf) {
      // the own vessel is looked up by its type, not an id
      this.info.emit({ id: id ?? '', type: 'self' });
    } else if (id !== null && type !== null) {
      this.info.emit({ id: id, type: type });
    }
  }

  // ** add a note linked to the popover's resource
  protected addNoteFromPopover() {
    const { id, type } = this.overlay();
    if (id === null || type === null) {
      return;
    }
    this.skres.showNoteEditor({ type, href: { id, exists: true } });
  }

  // ** list the notes linked to the popover's resource
  protected relatedNotesFromPopover() {
    const { id, type, readOnly } = this.overlay();
    if (id === null || type === null) {
      return;
    }
    this.skres.showRelatedNotes(id, type, readOnly);
  }

  /**
   * Popover "Points" action → opens the route's reorder dialog. A stored route
   * takes the normal path (the parent fetches it from the server). An unsaved
   * draft / dirty route has no server copy, so pass the buffer-derived route:
   * the parent opens the dialog from it without a fetch and reorders persist
   * back to the buffer (#583).
   */
  protected popoverPoints() {
    const { id, type } = this.overlay();
    if (id === null || type === null) {
      return;
    }
    const ub = this.getUnsavedRouteBuffer(id);
    this.info.emit({
      id,
      type,
      resource: ub ? this.bufferToFBRoute(ub) : undefined
    });
  }

  protected setActiveVessel(id: string | null = null) {
    this.focusVessel.emit(id);
  }

  // ******** Interactions: DRAW / EDIT / MEASURE ************

  /** Apply the selected Interaction mode */
  private applyInteractionMode(mode: INTERACTION_MODE, value: boolean) {
    this.popoverClosed();
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
      return toLonLat(i) as Position;
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
      this.app.config.units.distance === 'kilometer'
        ? threshold * 1000
        : Convert.nauticalMilesToKm(threshold) * 1000;

    this.app.debug(`mapMoveThresholdExceeded: ${d >= cr / 2}`);
    if (d >= cr / 2) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    } else {
      return false;
    }
  }

  // ** returns true if skresOther.refreshResourceSetsInBounds() should be called
  private shouldFetchResourceSets(zoomChanged?: boolean) {
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
  private shouldFetchNotes(zoomChanged?: boolean) {
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
  private getFeatureInfo() {
    /*fetch(this.featureUrl)
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
    });*/
    /*
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
    */
  }
}
