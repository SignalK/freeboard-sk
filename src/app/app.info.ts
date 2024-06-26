/** Application Information Service **
 * perform version checking etc. here
 * ************************************/
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Observable } from 'rxjs';

import { Info, SettingsMessage, IndexedDB } from './lib/services';

import {
  AlertDialog,
  ConfirmDialog,
  WelcomeDialog,
  MessageBarComponent
} from './lib/components/dialogs';

import { Convert } from './lib/convert';
import { SignalKClient } from 'signalk-client-angular';
import { SKVessel, SKChart, SKStreamProvider } from './modules';

import {
  PluginInfo,
  PluginSettings,
  FBAppConfig,
  AppUpdateMessage
} from './types';

// ** Configuration template**
const FreeboardConfig: FBAppConfig = {
  chartApi: 1, // set by feature detection
  experiments: false,
  version: '',
  darkMode: { enabled: false, source: 0 }, // source: 0= browser default, 1= Signal K mode, -1=manual)
  map: {
    // ** map config
    zoomLevel: 2,
    center: [0, 0],
    rotation: 0,
    moveMap: false,
    northUp: true,
    animate: false,
    limitZoom: false,
    invertColor: false
  },
  fixedLocationMode: false,
  fixedPosition: [0, 0],
  aisTargets: true, // display ais targets
  courseData: true, // show/hide course data
  toolBarButtons: true, // show/hide toolbar buttons
  notes: true, // display notes
  popoverMulti: false, // close popovers using cose button
  mapDoubleClick: false, // true=zoom
  depthAlarm: { enabled: false, smoothing: 10000 },
  anchorRadius: 40, // most recent anchor radius setting
  plugins: {
    instruments: '/@signalk/instrumentpanel',
    startOnOpen: false,
    parameters: null
  },
  units: {
    // ** display units
    distance: 'm',
    depth: 'm',
    speed: 'kn',
    temperature: 'c'
  },
  vessel: {
    trail: false, // display trail
    windVectors: true, // display vessel TWD, AWD vectors
    laylines: false,
    cogLine: 0, // display COG line
    headingLineSize: -1 // mode for display of heading line -1 = default
  },
  selections: {
    // ** saved selections
    routes: [],
    waypoints: [],
    tracks: [],
    charts: ['openstreetmap', 'openseamap'],
    notes: [],
    chartOrder: [], // chart layer ordering
    headingAttribute: 'navigation.headingTrue',
    preferredPaths: {
      tws: 'environment.wind.speedTrue',
      twd: 'environment.wind.directionTrue',
      heading: 'navigation.courseOverGroundTrue',
      course: 'navigation.courseGreatCircle'
    },
    positionFormat: 'XY',
    aisTargets: null,
    aisWindApparent: false,
    aisWindMinZoom: 15,
    aisShowTrack: false,
    aisMaxAge: 540000, // time since last update in ms (9 min)
    aisStaleAge: 360000, // time since last update in ms (6 min)
    aisProfile: 0, // ais display profile
    aisState: [], // list of ais state values used to filter targets
    notesMinZoom: 10,
    labelsMinZoom: 8,
    pluginFavourites: [],
    trailFromServer: false,
    trailDuration: 24, // number of hours of trail to fetch from server
    trailResolution: {
      // resolution of server trail at defined time horizons
      lastHour: '5s',
      next23: '1m',
      beyond24: '5m'
    },
    s57Options: {
      graphicsStyle: 'Paper',
      boundaries: 'Plain',
      colors: 4,
      shallowDepth: 2,
      safetyDepth: 3,
      deepDepth: 6
    },
    resourceSets: {}, // additional resources
    signalk: {
      // signal k connection options
      vessels: true,
      atons: true,
      aircraft: false,
      sar: false,
      meteo: true,
      maxRadius: 0, // max radius within which AIS targets are displayed
      proxied: false // server behind a proxy server
    },
    wakeLock: false,
    course: {
      autoNextPointOnArrival: false,
      autoNextPointDelay: 5000,
      autoNextPointTrigger: 'perpendicularPassed'
    }
  },
  resources: {
    // ** resource options
    notes: {
      rootFilter: '?position=%map:latitude%,%map:longitude%&dist=%note:radius%', // param string to provide record filtering
      getRadius: 20, // radius (NM/km) within which to return notes
      groupNameEdit: false,
      groupRequiresPosition: true
    },
    video: {
      enable: false,
      url: null
    },
    paths: []
  }
};

// ** default OSM charts **
export const OSM = [
  [
    'openstreetmap',
    new SKChart({
      name: 'World Map',
      description: 'Open Street Map'
    }),
    true
  ],
  [
    'openseamap',
    new SKChart({
      name: 'Sea Map',
      description: 'Open Sea Map',
      url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      minzoom: 12,
      maxzoom: 18,
      bounds: [-180, -90, 180, 90],
      type: 'tilelayer'
    }),
    true
  ]
];

@Injectable({ providedIn: 'root' })
export class AppInfo extends Info {
  private DEV_SERVER = {
    host: 'localhost', //'192.168.86.32', // host name || ip address
    port: 3000, // port number
    ssl: false
  };

  // controls map zoom limits
  public MAP_ZOOM_EXTENT = {
    min: 2,
    max: 28
  };

  public hostName: string;
  public hostPort: number;
  public hostSSL: boolean;
  public host = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hostParams: { [key: string]: any } = {};

  private fbAudioContext =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.AudioContext || (window as any).webkitAudioContext;
  public audio = { context: new this.fbAudioContext() };

  public db: AppDB;

  private suppressTrailFetch = false;

  public skApiVersion = 2;
  public plugin: PluginSettings = {
    version: '',
    settings: {}
  };

  get useMagnetic(): boolean {
    return this.config.selections.headingAttribute ===
      'navigation.headingMagnetic'
      ? true
      : false;
  }

  constructor(
    public signalk: SignalKClient,
    private stream: SKStreamProvider,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
    super();

    this.db = new AppDB();

    // process searchParams
    if (window.location.search) {
      const p = window.location.search.slice(1).split('&');
      p.forEach((i: string) => {
        const a = i.split('=');
        this.hostParams[a[0]] = a.length > 1 ? a[1] : null;
      });
    }

    // host
    this.hostName =
      typeof this.hostParams.host !== 'undefined'
        ? this.hostParams.host
        : this.devMode && this.DEV_SERVER.host
        ? this.DEV_SERVER.host
        : window.location.hostname;

    this.hostSSL =
      window.location.protocol === 'https:' ||
      (this.devMode && this.DEV_SERVER.ssl)
        ? true
        : false;

    this.hostPort =
      typeof this.hostParams.port !== 'undefined'
        ? parseInt(this.hostParams.port)
        : this.devMode && this.DEV_SERVER.port
        ? this.DEV_SERVER.port
        : parseInt(window.location.port);

    // if no port specified then set to 80 | 443
    this.hostPort = isNaN(this.hostPort)
      ? this.hostSSL
        ? 443
        : 80
      : this.hostPort;

    this.host = `${this.hostSSL ? 'https:' : 'http:'}//${this.hostName}:${
      this.hostPort
    }`;

    this.debug('host:', this.host);

    this.id = 'freeboard';
    this.name = 'Freeboard-SK';
    this.shortName = 'Freeboard';
    this.description = `Signal K Chart Plotter.`;
    this.version = '2.8.4';
    this.url = 'https://github.com/signalk/freeboard-sk';
    this.logo = './assets/img/app_logo.png';

    this.signalk.setAppId(this.id); // server stored data appId
    this.signalk.setAppVersion('1.0.0'); // server stored data version

    // base config
    this.config = JSON.parse(JSON.stringify(FreeboardConfig));
    // ** state data
    this.data = {
      firstRun: false,
      updatedRun: null,
      kioskMode: typeof this.hostParams.kiosk !== 'undefined' ? true : false,
      n2kRoute: null,
      optAppPanel: false,
      trueMagChoice: '',
      loggedIn: false,
      loginRequired: false,
      loggedInBadgeText: '!',
      hasToken: false,
      hasWakeLock: false,
      routes: [],
      waypoints: [],
      charts: [].concat(OSM),
      chartBounds: false,
      alarms: new Map(),
      notes: [],
      regions: [],
      tracks: [],
      resourceSets: {}, // additional resource sets
      selfId: null,
      activeRoute: null,
      activeRouteReversed: false,
      activeRouteCircular: false,
      activeRouteIsEditing: false,
      editingId: null,
      activeWaypoint: null,
      trail: [], // self vessel track / trail
      serverTrail: false, // trail received from server
      server: null,
      lastGet: null, // map position of last resources GET
      map: {
        suppressContextMenu: false
      },
      vessels: {
        // received vessel data
        showSelf: false,
        self: new SKVessel(),
        aisTargets: new Map(),
        aisTracks: new Map(), // AIS targets track (tracks plugin)
        activeId: null,
        active: null,
        closest: { id: null, distance: null, timeTo: null, position: [0, 0] },
        prefAvailablePaths: {} // preference paths available from source
      },
      aircraft: new Map(), // received AIS aircraft data
      atons: new Map(), // received AIS AtoN data
      sar: new Map(), // received AIS SaR data
      meteo: new Map(), // received AIS Meteo data
      aisMgr: {
        // manage aisTargets
        updateList: [],
        staleList: [],
        removeList: []
      },
      navData: {
        vmg: null,
        dtg: null,
        ttg: null,
        bearing: { value: null, type: null },
        bearingTrue: null,
        bearingMagnetic: null,
        xte: null,
        eta: null,
        position: null,
        pointIndex: -1,
        pointTotal: 0,
        arrivalCircle: null,
        startPosition: null,
        pointNames: [],
        activeRoutePoints: [],
        destPointName: ''
      },
      anchor: {
        // ** anchor watch
        raised: true,
        radius: 0,
        position: [0, 0],
        hasApi: true
      },
      autopilot: {
        console: false, // display Autopilot console
        hasApi: false // Server implements Autopilot API
      },
      buildRoute: {
        show: false
      },
      weather: {
        hasApi: false
      },
      measurement: {
        coords: [],
        index: -1
      }
    };
    this.data.map.suppressContextMenu = this.data.kioskMode;

    /***************************************
     * Subscribe to App events as required
     ***************************************/
    // ** version update **
    this.upgraded$.subscribe((version: AppUpdateMessage) => {
      this.handleUpgradeEvent(version);
    });
    // ** settings load / save events
    this.settings$.subscribe((value: SettingsMessage) => {
      this.handleSettingsEvent(value);
    });
    // ** database events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.db.dbUpdate$.subscribe((res: { action: string; value: any }) => {
      if (res.action) {
        switch (res.action) {
          case 'db_init':
            if (res.value) {
              if (this.config.vessel.trail) {
                this.db.getTrail().then((t) => {
                  this.data.trail = t && t.value ? t.value : [];
                });
              }
            }
            break;
          case 'trail_save':
            if (!res.value) {
              this.debug('app.trail.save.error', 'warn');
            }
            break;
        }
      }
    });

    this.init();

    // token from url params
    if (typeof this.hostParams.token !== 'undefined') {
      this.persistToken(this.hostParams.token);
    }

    // ** detect if launched in iframe **
    try {
      this.data.optAppPanel = window.self === window.top;
    } catch (e) {
      this.data.optAppPanel = false;
    }

    /***************************************
     * trigger app version check
     * uses: handleUpgradeEvent() subscription
     ***************************************/
    const v = this.checkVersion();
    if (!v.result) {
      //** current version
      this.loadConfig();
      this.loadData();
    }

    // ** check for internet connection **
    window
      .fetch('https://tile.openstreetmap.org') //'https://tiles.openseamap.org/seamark/')
      .then(() => {
        console.info('Internet connection detected.');
      })
      .catch(() => {
        console.warn('No Internet connection detected!');
        const mapsel = this.config.selections.charts;
        if (mapsel.includes('openstreetmap') || mapsel.includes('openseamap')) {
          this.showAlert(
            'Internet Map Service Unavailable: ',
            `Unable to display Open Street / Sea Maps!\n
                    Please check your Internet connection or select maps from the local network.\n
                    `
          );
        }
      });
  }

  // get plugin information
  fetchPluginSettings() {
    this.signalk
      .get(`/plugins/freeboard-sk/settings`)
      .subscribe((r: PluginSettings) => {
        this.plugin.settings = r.settings;
      });
    this.signalk.get(`/plugins/freeboard-sk`).subscribe(
      (r: PluginInfo) => {
        this.plugin.version = r.version;
      },
      () => {
        this.plugin.version = this.version;
      }
    );
  }

  // persist auth token for session
  persistToken(value: string) {
    if (value) {
      this.signalk.authToken = value;
      this.stream.postMessage({
        cmd: 'auth',
        options: {
          token: value
        }
      });
      document.cookie = `sktoken=${value}; SameSite=Strict`;
      this.data.hasToken = true; // hide login menu item
    } else {
      this.data.hasToken = false; // show login menu item
      this.signalk.authToken = null;
      this.data.loggedIn = false;
      document.cookie = `sktoken=${null}; SameSite=Strict; max-age=0;`;
      this.stream.postMessage({
        cmd: 'auth',
        options: {
          token: null
        }
      });
    }
  }

  // return auth token for session
  getToken(): string {
    const tk = new Map();
    document.cookie.split(';').map((i) => {
      const c = i.split('=');
      tk.set(c[0], c[1]);
    });
    if (tk.has('sktoken')) {
      return tk.get('sktoken');
    } else {
      return null;
    }
  }

  // fetch of trail from server (triggers SKStreamFacade.trail$)
  fetchTrailFromServer() {
    if (this.suppressTrailFetch) {
      this.suppressTrailFetch = false;
      return;
    }
    this.stream.postMessage({
      cmd: 'trail',
      options: {
        trailDuration: this.config.selections.trailDuration,
        trailResolution: this.config.selections.trailResolution
      }
    });
  }

  // ** handle App version upgrade **
  handleUpgradeEvent(version: AppUpdateMessage) {
    this.debug('App Upgrade Handler...Start...', 'info');
    this.debug(version);
    // *******************

    if (version.result && version.result === 'update') {
      this.debug('Upgrade result....new version detected');
      this.loadConfig();
      this.loadData();

      const pv = version.previous.split('.');
      const cv = version.new.split('.');
      if (pv[0] !== cv[0] || pv[1] !== cv[1]) {
        this.data['updatedRun'] = version;
      }
    } else if (version.result && version.result === 'new') {
      this.debug('Upgrade result....new installation');
      this.loadConfig();
      this.loadData();
      this.data['firstRun'] = true;
    }

    // *******************
    this.saveInfo();
    this.debug('App Upgrade Handler...End...', 'info');
  }

  // ** handle Settings load / save **
  handleSettingsEvent(value: SettingsMessage) {
    this.debug(value);
    if (value.action === 'load' && value.setting === 'config') {
      this.cleanConfig(this.config);
      if (this.config.fixedLocationMode) {
        this.data.vessels.self.position = [...this.config.fixedPosition];
        this.data.vessels.showSelf = true;
        this.config.map.center = [...this.config.fixedPosition];
      }
    }
  }

  // ** get user / plugin settings from server **
  loadSettingsfromServer(): Observable<boolean> {
    const sub: Subject<boolean> = new Subject();
    this.signalk.isLoggedIn().subscribe(
      (r) => {
        // fetch plugin settings
        this.fetchPluginSettings();
        this.data.loggedIn = r;
        if (r) {
          // ** get server stored config for logged in user **
          this.signalk.appDataGet('/').subscribe(
            (settings: FBAppConfig) => {
              if (Object.keys(settings).length === 0) {
                return;
              }
              this.cleanConfig(settings);
              if (this.validateConfig(settings)) {
                this.config = settings;
                this.saveConfig();
                sub.next(true);
              }
            },
            () => {
              console.info(
                'applicationData: Unable to retrieve settings from server!'
              );
              sub.next(false);
            }
          );
        }
      },
      () => {
        this.data.loggedIn = false;
        console.info('Unable to get loginStatus!');
        sub.next(false);
      }
    );
    return sub.asObservable();
  }

  // ** overloaded saveConfig() **
  saveConfig(suppressEvent?: boolean) {
    this.suppressTrailFetch = suppressEvent ?? false;
    super.saveConfig();
    if (this.data.loggedIn) {
      this.signalk.appDataSet('/', this.config).subscribe(
        () => this.debug('saveConfig: config saved to server.'),
        () => this.debug('saveConfig: Cannot save config to server!')
      );
    }
  }

  // ** clean loaded config /settings keys **
  cleanConfig(settings: FBAppConfig) {
    this.debug('Cleaning config keys...');

    if (typeof settings.fixedLocationMode === 'undefined') {
      settings.fixedLocationMode = false;
    }
    if (typeof settings.fixedPosition === 'undefined') {
      settings.fixedPosition = [0, 0];
    }

    if (typeof settings.vessel === 'undefined') {
      settings.vessel = {
        trail: true,
        windVectors: true,
        laylines: false,
        cogLine: 0,
        headingLineSize: -1
      };
    }
    if (typeof settings.vessel.laylines === 'undefined') {
      settings.vessel.laylines = false;
    }

    // changeover 2.7 - for removal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (settings as any).vesselTrail !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings.vessel.trail = (settings as any).vesselTrail;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (settings as any).vesselTrail;
    }
    // changeover 2.7 - for removal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (settings as any).vesselWindVectors !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings.vessel.windVectors = (settings as any).vesselWindVectors;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (settings as any).vesselWindVectors;
    }

    if (typeof settings.map.limitZoom === 'undefined') {
      settings.map.limitZoom = false;
    }

    if (typeof settings.map.invertColor === 'undefined') {
      settings.map.invertColor = false;
    }

    if (typeof settings.anchorRadius === 'undefined') {
      settings.anchorRadius = 40;
    }

    if (typeof settings.selections.aisShowTrack === 'undefined') {
      settings.selections.aisShowTrack = false;
    }

    if (typeof settings.selections.labelsMinZoom === 'undefined') {
      settings.selections.labelsMinZoom = 8;
    }

    // changeover 2.7 - for removal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (settings as any).aisShowTrack !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings.selections.aisShowTrack = (settings as any).aisShowTrack;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (settings as any).aisShowTrack;
    }

    if (typeof settings.toolBarButtons === 'undefined') {
      settings.toolBarButtons = true;
    }

    if (typeof settings.units.temperature === 'undefined') {
      settings.units.temperature = 'c';
    }

    if (typeof settings.selections === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settings as any).selections = {};
    }

    if (typeof settings.selections.aisWindMinZoom === 'undefined') {
      settings.selections.aisWindMinZoom = 15;
    }
    if (typeof settings.selections.aisWindApparent === 'undefined') {
      settings.selections.aisWindApparent = false;
    }
    if (typeof settings.selections.notesMinZoom === 'undefined') {
      settings.selections.notesMinZoom = 10;
    }
    if (typeof settings.selections.preferredPaths === 'undefined') {
      settings.selections.preferredPaths = {
        tws: 'environment.wind.speedTrue',
        twd: 'environment.wind.directionTrue',
        heading: 'navigation.courseOverGroundTrue',
        course: 'navigation.courseGreatCircle'
      };
    }
    if (typeof settings.selections.preferredPaths.course === 'undefined') {
      settings.selections.preferredPaths.course =
        'navigation.courseGreatCircle';
    }
    if (typeof settings.selections.pluginFavourites === 'undefined') {
      settings.selections['pluginFavourites'] = [];
    }
    if (typeof settings.selections.positionFormat === 'undefined') {
      settings.selections['positionFormat'] = 'XY';
    }
    if (typeof settings.selections.chartOrder === 'undefined') {
      settings.selections['chartOrder'] = [];
    }
    if (typeof settings.selections.tracks === 'undefined') {
      settings.selections.tracks = [];
    }
    if (typeof settings.selections.trailDuration === 'undefined') {
      settings.selections.trailDuration = 24;
    }
    if (typeof settings.selections.trailResolution === 'undefined') {
      settings.selections.trailResolution = {
        lastHour: '5s',
        next23: '1m',
        beyond24: '5m'
      };
    }
    if (typeof settings.selections.resourceSets === 'undefined') {
      settings.selections.resourceSets = {};
    }
    if (typeof settings.selections.aisMaxAge === 'undefined') {
      settings.selections.aisMaxAge = 540000;
    }
    if (typeof settings.selections.aisStaleAge === 'undefined') {
      settings.selections.aisStaleAge = 360000;
    }
    if (typeof settings.selections.aisProfile === 'undefined') {
      settings.selections.aisProfile = 0;
    }
    if (typeof settings.selections.aisState === 'undefined') {
      settings.selections.aisState = [];
    }
    if (typeof settings.selections.signalk === 'undefined') {
      settings.selections.signalk = {
        vessels: true,
        atons: true,
        aircraft: false,
        sar: false,
        meteo: true,
        maxRadius: 0,
        proxied: false
      };
    }
    if (typeof settings.selections.signalk.meteo === 'undefined') {
      settings.selections.signalk.meteo = true;
    }
    if (typeof settings.selections.wakeLock === 'undefined') {
      settings.selections.wakeLock = false;
    }

    if (typeof settings.selections.course === 'undefined') {
      settings.selections.course = {
        autoNextPointOnArrival: false,
        autoNextPointDelay: 5000,
        autoNextPointTrigger: 'perpendicularPassed'
      };
    } else {
      if (
        typeof settings.selections.course.autoNextPointTrigger === 'undefined'
      ) {
        settings.selections.course.autoNextPointTrigger = 'perpendicularPassed';
      }
    }

    if (typeof settings.selections.s57Options === 'undefined') {
      settings.selections.s57Options = {
        graphicsStyle: 'Paper',
        boundaries: 'Plain',
        colors: 4,
        shallowDepth: 2,
        safetyDepth: 3,
        deepDepth: 6
      };
    }

    if (typeof settings.plugins === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settings as any).plugins = {};
    }
    if (typeof settings.plugins.parameters === 'undefined') {
      settings.plugins.parameters = null;
    }

    if (typeof settings.resources === 'undefined') {
      settings.resources = {
        notes: {
          rootFilter:
            '?position=[%map:longitude%,%map:latitude%]&distance=%note:radius%',
          getRadius: 20,
          groupNameEdit: false,
          groupRequiresPosition: false
        },
        video: {
          enable: false,
          url: ''
        },
        paths: []
      };
    } else {
      if (typeof settings.resources.video === 'undefined') {
        settings.resources.video = { enable: false, url: '' };
      }
      if (typeof settings.resources.paths === 'undefined') {
        settings.resources.paths = [];
      }
    }
    // update rootFilter params
    if (typeof settings.resources.notes.rootFilter !== 'undefined') {
      settings.resources.notes.rootFilter =
        settings.resources.notes.rootFilter.replace('dist=', 'distance=');
      settings.resources.notes.rootFilter =
        settings.resources.notes.rootFilter.replace(
          `position=%map:latitude%,%map:longitude%`,
          `position=[%map:longitude%,%map:latitude%]`
        );
    }

    // apply url params
    if (typeof this.hostParams.northup !== 'undefined') {
      this.config.map.northUp = this.hostParams.northup === '0' ? false : true;
    }
    if (typeof this.hostParams.movemap !== 'undefined') {
      this.config.map.moveMap = this.hostParams.movemap === '0' ? false : true;
    }
    if (this.hostParams.zoom) {
      try {
        const z = parseInt(this.hostParams.zoom as string);
        if (!isNaN(z)) {
          this.config.map.zoomLevel = z > 28 ? 28 : z < 1 ? 1 : z;
        }
      } catch (error) {
        console.warn('Invalid zoom level supplied!');
      }
    }
  }

  // ** validate settings against base config **
  validateConfig(settings: FBAppConfig): boolean {
    let result = true;
    const skeys = Object.keys(settings);
    Object.keys(FreeboardConfig).forEach((i) => {
      if (!skeys.includes(i)) {
        result = false;
      }
    });
    return result;
  }

  // ** show Help at specified anchor
  showHelp(anchor?: string) {
    const url = `./assets/help/index.html${anchor ? '#' + anchor : ''}`;
    window.open(url, 'help');
  }

  // ** display Welcome dialog
  showWelcome() {
    const WelcomeMessages = {
      welcome: {
        title: 'Welcome to Freeboard',
        message: `Freeboard is your Signal K chartplotter WebApp from which
                    you can manage routes, waypoints, notes, alarms, 
                    notifications and more.`
      },
      'signalk-server-node': {
        title: 'Server Plugins',
        message: `Some Freeboard features require that certain plugins are installed to service the 
                    required Signal K API paths.
                    <br>&nbsp;<br>
                    See <a href="assets/help/index.html" target="help">HELP</a> 
                    for more details.`
      },
      experiments: {
        title: 'Experiments',
        message: `
                    Experiments are a means for testing out potential new features
                    in Freeboard.
                    <br>&nbsp;<br>
                    You can enable Experiments in <b><i>Settings</i></b>.
                    <br>&nbsp;<br>
                    Check out <a href="assets/help/index.html#experiments" target="help">HELP</a> 
                    for more details.`
      },
      'whats-new': [
        /*{
          type: 'signalk-server-node',
          title: 'OpenWeather 3.0 Support',
          message: `
            OpenWeather is deprecating support for v2.5 of their API in April 2024!
            <br>&nbsp;<br>
            Freeboard-SK now supports the v3.0 API which will require you to supply
            a new API Key in the configuration.
          `
        }*/
      ]
    };

    let btnText = 'Get Started';
    const messages = [];
    let showPrefs = false;

    if (!this.data.kioskMode && (this.data.firstRun || this.data.updatedRun)) {
      if (this.data.firstRun) {
        messages.push(WelcomeMessages['welcome']);
        if (this.data.server && this.data.server.id) {
          messages.push(WelcomeMessages[this.data.server.id]);
          showPrefs = true;
        }
      } else {
        if (
          WelcomeMessages['whats-new'] &&
          WelcomeMessages['whats-new'].length > 0
        ) {
          WelcomeMessages['whats-new'].forEach((msg) => {
            if (msg.type) {
              if (
                this.data.server &&
                this.data.server.id &&
                msg.type === this.data.server.id
              ) {
                messages.push(msg);
              }
            } else {
              messages.push(msg);
            }
          });
        }
        btnText = 'Got it';
      }

      if (messages.length === 0) {
        return;
      }
      return this.dialog.open(WelcomeDialog, {
        disableClose: true,
        data: {
          buttonText: btnText,
          content: messages,
          showPrefs: showPrefs
        }
      });
    }
  }

  // ** display alert dialog
  showAlert(title: string, message: string, btn?: string) {
    return this.dialog
      .open(AlertDialog, {
        disableClose: false,
        data: {
          message: message,
          title: title,
          buttonText: btn
        }
      })
      .afterClosed();
  }

  // ** display message bar
  showMessage(message: string, sound = false, duration = 5000) {
    this.snackbar.openFromComponent(MessageBarComponent, {
      duration: duration,
      data: { message: message, sound: sound }
    });
  }

  // ** display confirm dialog **
  showConfirm(
    message: string,
    title: string,
    btn1?: string,
    btn2?: string,
    checkText?: string
  ) {
    return this.dialog
      .open(ConfirmDialog, {
        disableClose: true,
        data: {
          message: message,
          title: title,
          button1Text: btn1,
          button2Text: btn2,
          checkText: checkText
        }
      })
      .afterClosed();
  }

  /** returns a formatted string containing the value (converted to the preferred units)
   * and units. (e.g. 12.5 knots, 8.8 m/s)
   * Numbers are fixed to 1 decimal point
   */
  formatValueForDisplay(
    value: number,
    sourceUnits: 'K' | 'm/s' | 'rad' | 'm' | 'ratio' | 'deg',
    depthValue?: boolean
  ): string {
    if (sourceUnits === 'K') {
      return this.config.units.temperature === 'c'
        ? `${Convert.kelvinToCelcius(value).toFixed(1)}${String.fromCharCode(
            186
          )}C`
        : `${Convert.kelvinToFarenheit(value).toFixed(1)}${String.fromCharCode(
            186
          )}F`;
    } else if (sourceUnits === 'ratio') {
      return Math.abs(value) <= 1
        ? `${(value * 100).toFixed(1)}%`
        : value.toFixed(4);
    } else if (sourceUnits === 'rad') {
      return `${Convert.radiansToDegrees(value).toFixed(
        1
      )}${String.fromCharCode(186)}`;
    } else if (sourceUnits === 'deg') {
      return `${value.toFixed(1)}${String.fromCharCode(186)}`;
    } else if (sourceUnits === 'm') {
      if (depthValue) {
        return this.config.units.depth === 'm'
          ? `${value.toFixed(1)} m`
          : `${Convert.metersToFeet(value).toFixed(1)} ft`;
      } else {
        return this.config.units.distance !== 'ft'
          ? `${(value / 1000).toFixed(1)} km`
          : `${Convert.kmToNauticalMiles(value / 1000).toFixed(1)} NM`;
      }
    } else if (sourceUnits === 'm/s') {
      switch (this.config.units.speed) {
        case 'kmh':
          return `${Convert.msecToKmh(value).toFixed(1)} km/h`;
        case 'kn':
          return `${Convert.msecToKnots(value).toFixed(1)} knots`;
        case 'mph':
          return `${Convert.msecToMph(value).toFixed(1)} mph`;
        default:
          return `${value} ${sourceUnits}`;
      }
    } else {
      // timestamp
      if (typeof value === 'string') {
        if (value[String(value).length - 1] === 'Z' && value[10] === 'T') {
          return new Date(value).toLocaleString();
        }
      }
      return `${value}${sourceUnits}`;
    }
  }

  // convert speed value and set the value of this.app.formattedSpeedUnits
  formatSpeed(value: number, asString = false): string | number {
    const valIsNumber = typeof value === 'number';
    switch (this.config.units.speed) {
      case 'kn':
        value = Convert.msecToKnots(value);
        this.formattedSpeedUnits = 'knots';
        break;
      case 'kmh':
        value = Convert.msecToKmh(value);
        this.formattedSpeedUnits = 'km/h';
        break;
      case 'mph':
        value = Convert.msecToMph(value);
        this.formattedSpeedUnits = 'mph';
        break;
      default:
        this.formattedSpeedUnits = 'm/s';
    }
    if (asString) {
      return valIsNumber ? value.toFixed(1) : '-';
    } else {
      return valIsNumber ? value : '-';
    }
  }

  formattedSpeedUnits = 'knots';
}

/******************
 ** App Database  **
 ******************/
export class AppDB {
  private db: IndexedDB;
  private dbUpdateSource;
  public dbUpdate$;

  constructor() {
    this.dbUpdateSource = new Subject<string>();
    this.dbUpdate$ = this.dbUpdateSource.asObservable();
    this.db = new IndexedDB('freeboard', 1);

    this.db
      .openDatabase(1, (evt) => {
        const trail = evt.currentTarget.result.createObjectStore('trail', {
          keyPath: 'uuid'
        });
        trail.createIndex('uuid_idx', 'uuid', { unique: true });
      })
      .then(
        () => {
          this.emitDbUpdate({ action: 'db_init', value: true });
        },
        () => {
          this.emitDbUpdate({ action: 'db_init', value: false });
        }
      );
  }

  // ** emit dbUpdate message **
  emitDbUpdate(value = null) {
    this.dbUpdateSource.next(value);
  }

  // ** get veesel trail **
  getTrail(id = 'self') {
    return this.db.getByIndex('trail', 'uuid_idx', id);
  }

  // ** create / update vessel trail entry**
  saveTrail(id = 'self', trailData) {
    this.db.update('trail', { uuid: id, value: trailData }).then(
      () => {
        this.emitDbUpdate({ action: 'trail_save', value: true });
      },
      () => {
        this.db.add('trail', { uuid: id, value: trailData }).then(
          () => {
            this.emitDbUpdate({ action: 'trail_save', value: true });
          },
          () => {
            this.emitDbUpdate({ action: 'trail_save', value: false });
          }
        );
      }
    );
  }
}
