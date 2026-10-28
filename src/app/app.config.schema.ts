import { Type, type TSchema } from 'typebox';
import type {
  DepthUnitDef,
  DistanceUnitDef,
  LengthUnitDef,
  MapPanBehavior,
  MFBAction,
  Position,
  SpeedUnitDef,
  TemperatureUnitDef,
  WindIndicator
} from './types';
import type { LineStyleDash } from './modules/settings/components/linestyle-select.component';
import type { OwnVesselIconType } from './modules/icons/vessels';
import type { TrailSource } from './modules/skstream/track-source';
import {
  DefaultOptions,
  type Options as S57Options
} from './modules/map/ol/lib/charts/s57.service';
import { DEFAULT_TAP_FADE_SPEED } from './modules/map/cursor-marker';

// A choice is checked only as a string or a number: a value a later release
// adds must survive an earlier release reading and saving the same config, as
// the App Store and the server's built-in Freeboard share it.
const choice = <T extends string | number>(value: T) =>
  Type.Unsafe<T>(
    typeof value === 'number'
      ? Type.Number({ default: value })
      : Type.String({ default: value })
  );
const bool = (value: boolean) => Type.Boolean({ default: value });
const num = (value: number) => Type.Number({ default: value });
const str = (value: string) => Type.String({ default: value });
const strings = (value: string[] = []) =>
  Type.Array(Type.String(), { default: value });
const nullable = <T extends TSchema>(schema: T, value: unknown = null) =>
  Type.Union([schema, Type.Null()], { default: value });
const position = () =>
  Type.Unsafe<Position>(
    Type.Array(Type.Number(), { minItems: 2, maxItems: 3, default: [0, 0] })
  );
const palettePosition = () =>
  nullable(Type.Object({ x: Type.Number(), y: Type.Number() }));
const selfLine = (length: number, color: string, weight: number) =>
  Type.Object({
    length: num(length),
    color: str(color),
    weight: num(weight),
    dash: choice<LineStyleDash>('none')
  });

/**
 * The app settings and the default of each. `cleanConfig()` fills a setting
 * that is missing, or stored with the wrong type, from it.
 */
export const AppConfigSchema = Type.Object({
  ui: Type.Object({
    mapNorthUp: bool(true),
    mapMove: bool(false), // keep vessel centered
    mapConstrainZoom: bool(false), // constrain zooming to map min / max values
    toolbarButtons: bool(true),
    invertColor: bool(false), // invert map feature label colors
    showCourseData: bool(true),
    showAisTargets: bool(true),
    showNotes: bool(true),
    autoNightMode: bool(true)
  }),
  // remembered drag offsets of the chart Image Adjustment, Time and Track
  // history palettes
  imageAdjustPalettePos: palettePosition(),
  timePalettePos: palettePosition(),
  trackHistoryPalettePos: palettePosition(),
  display: Type.Object({
    fab: choice<MFBAction>('wpt'),
    disableWakelock: bool(false),
    darkMode: Type.Object({
      enabled: bool(false),
      source: choice<0 | 1 | -1>(0) // 0 = browser default, 1 = Signal K mode, -1 = manual
    }),
    nightMode: bool(true), // follow environment.mode
    muteSound: bool(false),
    depthAlarm: Type.Object({ enabled: bool(false), smoothing: num(10000) }),
    plugins: Type.Object({
      instruments: nullable(Type.String(), '/@signalk/instrumentpanel'),
      startOnOpen: bool(true),
      parameters: nullable(Type.String()),
      favourites: strings()
    }),
    preferInfoPanel: bool(true),
    splitView: bool(false), // offer the Split view button: a second chart pane
    singleClickNoteDetails: bool(false),
    windIndicator: choice<WindIndicator>('barb'),
    statusBar: Type.Object({
      liveEta: bool(false), // cursor bearing/distance/ETA in the status bar
      referenceSpeed: num(6), // boat speed (display units) for ETA when SOG is ~0
      tapFadeSpeed: num(DEFAULT_TAP_FADE_SPEED) // seconds a tapped-point marker takes to fade
    })
  }),
  units: Type.Object({
    distance: choice<DistanceUnitDef>('kilometer'),
    depth: choice<DepthUnitDef>('m'),
    length: choice<LengthUnitDef>('m'),
    speed: choice<SpeedUnitDef>('kn'),
    temperature: choice<TemperatureUnitDef>('C'),
    positionFormat: choice<'XY' | 'SHDd' | 'HDd' | 'DMdH' | 'HDMS' | 'DHMS'>(
      'XY'
    ),
    headingAttribute: choice<
      'navigation.headingTrue' | 'navigation.headingMagnetic'
    >('navigation.headingTrue'),
    preferredPaths: Type.Object({
      tws: str('environment.wind.speedTrue'),
      twd: str('environment.wind.directionTrue'),
      /** A Signal K path, or 'auto' to resolve the best available source. */
      heading: str('auto'),
      course: str('navigation.courseGreatCircle')
    }),
    /** One-time marker for the COG -> 'auto' orientation migration (#704). */
    // @todo remove (implemented) v2.32.0
    autoHeadingApplied: bool(true),
    useServerPrefs: bool(true)
  }),
  map: Type.Object({
    zoomLevel: num(2),
    center: position(),
    rotation: num(0),
    panBehavior: choice<MapPanBehavior>('offset'), // what panning does while following the vessel
    refollowDelay: num(0), // secs of idle before a pan-released follow resumes; 0 = never
    // glide the chart to each new centre, zoom and rotation; a new key, as
    // configs saved since 2021 hold an `animate: false` nothing ever used
    animation: bool(true),
    labelsMinZoom: num(8),
    doubleClickZoom: bool(false),
    overZoomTiles: bool(true), // keep tiles visible beyond chart max zoom
    // screen-fixed map-centre offset from the vessel
    centerOffset: Type.Object({ x: num(0), y: num(0) }),
    s57Options: Type.Object({
      graphicsStyle: choice<S57Options['graphicsStyle']>('Paper'),
      boundaries: choice<S57Options['boundaries']>('Plain'),
      colors: choice<S57Options['colors']>(4),
      shallowDepth: num(2),
      safetyDepth: num(3),
      deepDepth: num(6),
      colorTable: num(0),
      otherLayers: strings(DefaultOptions.otherLayers),
      depthUnit: choice<S57Options['depthUnit']>('m')
    }),
    popoverMulti: bool(false) // close popovers using the close button
  }),
  course: Type.Object({
    autoNextPointOnArrival: bool(false),
    autoNextPointDelay: num(5000),
    autoNextPointTrigger: choice<
      'perpendicularPassed' | 'arrivalCircleEntered'
    >('perpendicularPassed'),
    arrivalCircle: nullable(Type.Number(), 100)
  }),
  vessels: Type.Object({
    fixedLocationMode: bool(false),
    fixedPosition: position(),
    trail: bool(true), // from the server when it can supply one (#820)
    windVectors: bool(true), // vessel TWD, AWD vectors
    laylines: bool(false),
    selfLines: Type.Object({
      cog: selfLine(10, 'rgba(204, 12, 225, 0.7)', 1), // length in minutes at SOG
      heading: selfLine(-1, 'rgba(221, 99, 0, 0.5)', 4) // length -1 = default
    }),
    aisCogLine: num(10), // minutes
    iconScale: num(0.9),
    iconActualSize: bool(false), // scale to the reported beam and length overall
    iconType: choice<OwnVesselIconType>('classic'),
    rangeCircles: bool(false),
    rangeCirclesFixed: bool(false), // a fixed distance rather than one from the zoom
    rangeCirclesDistance: num(1000), // m, between circles when fixed
    rangeCircleCount: num(4),
    rangeCircleMinZoom: num(8),
    aisStaleAge: num(360000), // ms since last update (6 min)
    aisMaxAge: num(540000), // ms since last update (9 min)
    aisWindApparent: bool(false),
    aisWindMinZoom: num(15),
    aisShowTrack: bool(false),
    aisTrackLength: num(12), // hours of track for a vessel picked with its TRACK toggle
    trailSource: choice<TrailSource>('auto'),
    trailDuration: num(24), // hours; TRAIL_DURATION_ALL for the whole recorded track
    // resolution of the server trail at each time horizon
    trailResolution: Type.Object({
      lastHour: str('5s'),
      next23: str('5s'),
      beyond24: str('10s')
    }),
    /** One-time marker for the move off the old 1 min / 5 min trail
     * resolution defaults. */
    trailResolutionApplied: bool(true)
  }),
  resources: Type.Object({
    fetchFilter: str(
      '?position=[%map:longitude%,%map:latitude%]&distance=%fetch:radius%'
    ),
    fetchRadius: num(0), // nmi/km within which to return resources
    notes: Type.Object({
      rootFilter: str(
        '?position=[%map:longitude%,%map:latitude%]&distance=%note:radius%'
      ),
      getRadius: num(20), // nmi/km within which to return notes
      groupNameEdit: bool(false),
      groupRequiresPosition: bool(true),
      minZoom: num(10)
    }),
    video: Type.Object({
      enable: bool(false),
      url: nullable(Type.String())
    }),
    paths: strings()
  }),
  signalk: Type.Object({
    vessels: bool(true),
    atons: bool(true),
    aircraft: bool(false),
    sar: bool(false),
    meteo: bool(true),
    maxRadius: num(0), // max radius within which AIS targets are displayed
    proxied: bool(true) // server behind a proxy server
  }),
  anchor: Type.Object({
    radius: num(60), // most recent anchor radius setting
    setRadius: bool(false),
    manualSet: bool(false),
    rodeLength: num(50)
  }),
  radars: Type.Object({
    deviceId: Type.Optional(Type.String()),
    opacity: num(1),
    rings: bool(true), // range circles follow the radar range while it transmits
    overlay: bool(false) // radar picture shown on the chart, again after a reload
  }),
  experiments: bool(false),
  plotterExtensions: Type.Object({
    // No enabled list: extension availability is controlled on the server
    // (plugin install/enable); presence in the resources response = enabled.
    // user's show/fade choice per image overlay, keyed `<extension>/<overlay id>`
    overlays: Type.Optional(
      Type.Record(
        Type.String(),
        Type.Object({ visible: Type.Boolean(), opacity: Type.Number() })
      )
    ),
    widgets: Type.Array(
      Type.Object({
        instanceId: Type.String(), // host-assigned GUID for this placement
        extension: Type.String(), // extension (resource) id
        widget: Type.String(), // manifest-local widget id
        anchor: Type.Unsafe<'tr' | 'ct' | 'cb' | 'bl' | 'br'>(Type.String()),
        col: Type.Number(), // origin cell column (0 | 1)
        row: Type.Number() // origin cell row (0 | 1)
      }),
      { default: [] }
    )
  }),
  selections: Type.Object({
    routes: strings(),
    waypoints: strings(),
    regions: strings(),
    tracks: nullable(Type.Array(Type.String())),
    charts: strings(['openstreetmap', 'openseamap']),
    chartOrder: strings(['openstreetmap', 'openseamap']), // chart layer ordering
    chartOpacity: Type.Record(Type.String(), Type.Number(), { default: {} }),
    chartImageAdjustment: Type.Record(
      Type.String(),
      Type.Object({ brightness: Type.Number(), contrast: Type.Number() }),
      { default: {} }
    ),
    chartDisplayMinZoom: Type.Record(Type.String(), Type.Number(), {
      default: {}
    }),
    // Time palette loop range per chart
    chartTimeLoop: Type.Record(
      Type.String(),
      Type.Object({ start: Type.Number(), end: Type.Number() }),
      { default: {} }
    ),
    aisTargets: nullable(Type.Array(Type.String())),
    aisTargetTypes: Type.Array(Type.Number(), { default: [] }),
    aisFilterByShipType: bool(false),
    aisState: strings(), // ais state values used to filter targets
    resourceSets: Type.Record(Type.String(), Type.Any(), { default: {} }), // additional resources
    infolayers: nullable(Type.Array(Type.String())),
    weatherWindEnabled: bool(false),
    oceanCurrentsEnabled: bool(false),
    tidalCurrentsEnabled: bool(false),
    chartsInViewOnly: bool(false) // chart list shows only charts in the map view
  })
});
