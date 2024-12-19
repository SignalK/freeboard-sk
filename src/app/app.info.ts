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
  AppUpdateMessage,
  Position
} from './types';

import {
  IAppConfig,
  DefaultConfig,
  validateConfig,
  cleanConfig
} from './app.settings';

import { WELCOME_MESSAGES } from './app.messages';

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
      minzoom: 1,
      maxzoom: 24,
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

  private skLoginSource: Subject<string>;
  public skLogin$: Observable<string>;
  private watchingSKLogin: number;

  constructor(
    public signalk: SignalKClient,
    private stream: SKStreamProvider,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
    super();

    this.db = new AppDB();

    this.skLoginSource = new Subject<string>();
    this.skLogin$ = this.skLoginSource.asObservable();

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
    this.version = '2.13.0';
    this.url = 'https://github.com/signalk/freeboard-sk';
    this.logo = './assets/img/app_logo.png';

    this.signalk.setAppId(this.id); // server stored data appId
    this.signalk.setAppVersion('1.0.0'); // server stored data version

    // apply base config
    this.config = JSON.parse(JSON.stringify(DefaultConfig));
    // apply default data
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
        suppressContextMenu: false,
        atClick: {
          features: [],
          lonlat: [0, 0]
        }
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
        prefAvailablePaths: {}, // preference paths available from source,
        flagged: [] // flagged ais targets
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
      racing: {
        startLine: [],
        finishLine: []
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
        hasApi: false, // Server implements Autopilot API
        isLocal: false // FB AP API
      },
      skIcons: {
        hasApi: false
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
              if (this.config.selections.vessel.trail) {
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
          if (!this.data.kioskMode) {
            this.showAlert(
              'Internet Map Service Unavailable: ',
              `Unable to display Open Street / Sea Maps!\n
                      Please check your Internet connection or select maps from the local network.\n
                      `
            );
          }
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

  // Start watching for change in skLoginInfo cookie
  watchSKLogin() {
    if (this.watchingSKLogin) return;
    this.watchingSKLogin = window.setInterval(
      (() => {
        let lastCookie = this.getCookie(document.cookie, 'skLoginInfo');
        return () => {
          const currentCookie = this.getCookie(document.cookie, 'skLoginInfo');
          if (currentCookie !== lastCookie) {
            lastCookie = currentCookie;
            this.skLoginSource.next(currentCookie);
          }
        };
      })(),
      2000
    );
  }

  // return FB auth token for session
  getFBToken(): string {
    return this.getCookie(document.cookie, 'sktoken');
  }

  // return the requested cookie
  private getCookie(c: string, sel: 'sktoken' | 'skLoginInfo') {
    if (!c) {
      return undefined;
    }
    const tk = new Map();
    c.split(';').map((i) => {
      const c = i.split('=');
      tk.set(c[0], c[1]);
    });
    if (tk.has(sel)) {
      return tk.get(sel);
    } else {
      return undefined;
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
      cleanConfig(this.config, this.hostParams);
      if (this.config.fixedLocationMode) {
        this.data.vessels.self.position = [
          ...this.config.fixedPosition
        ] as Position;
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
            (settings: IAppConfig) => {
              if (Object.keys(settings).length === 0) {
                return;
              }
              cleanConfig(settings, this.hostParams);
              if (validateConfig(settings)) {
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

  // ** show Help at specified anchor
  showHelp(anchor?: string) {
    const url = `./assets/help/index.html${anchor ? '#' + anchor : ''}`;
    window.open(url, 'help');
  }

  // ** display Welcome dialog
  showWelcome() {
    let btnText = 'Get Started';
    const messages = [];
    let showPrefs = false;

    if (!this.data.kioskMode && (this.data.firstRun || this.data.updatedRun)) {
      if (this.data.firstRun) {
        messages.push(WELCOME_MESSAGES['welcome']);
        if (this.data.server && this.data.server.id) {
          messages.push(WELCOME_MESSAGES[this.data.server.id]);
          showPrefs = true;
        }
      } else {
        if (
          WELCOME_MESSAGES['whats-new'] &&
          WELCOME_MESSAGES['whats-new'].length > 0
        ) {
          WELCOME_MESSAGES['whats-new'].forEach((msg) => {
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
        if (this.config.units.distance !== 'ft') {
          return value < 1000
            ? `${value.toFixed(0)} m`
            : `${(value / 1000).toFixed(1)} km`;
        } else {
          const nm = Convert.kmToNauticalMiles(value / 1000);
          return nm < 0.5
            ? this.formatValueForDisplay(value, 'm', true)
            : `${nm.toFixed(1)} NM`;
        }
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
