/** Application Information Service **
 * perform version checking etc. here
 * ************************************/
import { effect, inject, Injectable, isDevMode, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

import { InfoService, IndexedDB, AppInfoDef } from './lib/services';

import {
  AlertDialog,
  ConfirmDialog,
  WelcomeDialog,
  MessageBarComponent,
  MsgBox,
  ErrorListDialog
} from './lib/components/dialogs';

import { Convert } from './lib/convert';
import { SignalKClient } from 'signalk-client-angular';
import { SKWorkerService } from './modules';

import { Position, ErrorList, IAppConfig, LineString } from './types';

import {
  defaultConfig,
  validateConfig,
  cleanConfig,
  initData
} from './app.config';

import { WELCOME_MESSAGES } from './app.messages';
import { getSvgList } from './modules/icons';
import { HttpErrorResponse } from '@angular/common/http';
import { Extent } from 'ol/extent';
import { GeoUtils } from './lib/geoutils';
import { S57Service } from './modules/map/ol';

/** Parent Window message */
interface ParentMessage {
  settings?: {
    autoNightMode?: boolean;
  };
  commands?: {
    nightModeEnable?: boolean;
  };
}

// App details
const FSK: AppInfoDef = {
  id: 'freeboard',
  name: 'Freeboard-SK',
  description: `Signal K Chart Plotter.`,
  version: '2.19.7-beta.2',
  url: 'https://github.com/signalk/freeboard-sk',
  logo: './assets/img/app_logo.png'
};

const SERVER_APPDATA_VERSION = '1.0.0';

// Development SK server host details
const DEV_SERVER = {
  host: 'localhost', //'192.168.86.32', // host name || ip address
  port: 3000, // port number
  ssl: false
};

@Injectable({ providedIn: 'root' })
export class AppFacade extends InfoService {
  // Signal K API version to use
  public skApiVersion = 2;

  /**Host server details */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hostDef: any = {
    name: undefined,
    port: undefined,
    ssl: false,
    url: undefined,
    params: {}
  };

  public readonly STANDARD_RESOURCES = [
    'routes',
    'waypoints',
    'regions',
    'notes',
    'charts'
  ];
  public readonly CUSTOM_RESOURCES = [
    {
      name: 'tracks',
      description: 'Freeboard GPX track imports.',
      featureKey: 'resourceTracks'
    },
    {
      name: 'infolayers',
      description: 'Freeboard map overlays.',
      featureKey: 'infoLayers'
    },
    {
      name: 'groups',
      description: 'Freeboard resource groups.',
      featureKey: 'resourceGroups'
    }
  ];
  public get IGNORE_RESOURCES() {
    return this.STANDARD_RESOURCES.concat(
      this.CUSTOM_RESOURCES.map((i) => i.name),
      ['buddies']
    );
  }

  // controls map zoom limits
  public MAP_ZOOM_EXTENT = {
    min: 2,
    max: 28
  };

  private fbAudioContext =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.AudioContext || (window as any).webkitAudioContext;
  public audio = { context: new this.fbAudioContext() };

  public db: AppDB;

  public watchingSKLogin: number; // watch interval timer

  // signals
  kioskMode = signal<boolean>(false); // kiosk mode flag
  hasAuthToken = signal<boolean>(false); // auth token has been presented
  isLoggedIn = signal<boolean>(false); // logged in to SK Server
  instrumentPanelAvailable = signal<boolean>(true); // show instrument panel button
  skAuthChange = signal<string | undefined>(undefined); // Signal K cookie change event

  sIsFetching = signal<boolean>(false); // show progress for fetching data from server
  sTrueMagChoice = signal<string>(''); // preferred path True / Magnetic

  // non-persisted UIstate attributes
  uiCtrl = signal<{
    alertList: boolean; // display AlertList
    autopilotConsole: boolean; // display AutopilotConsole
    radarLayer: boolean; // display Radar map Layer
    routeBuilder: boolean; // display BuildRoute
    suppressContextMenu: boolean; // prevent display of context menu
    forceNightMode: boolean; // force setting of night mode
  }>({
    alertList: false,
    autopilotConsole: false,
    radarLayer: false,
    routeBuilder: false,
    suppressContextMenu: false,
    forceNightMode: false
  });

  // persisted UI configuration items
  uiConfig = signal<{
    mapNorthUp: boolean; // map North / Heading Up
    mapMove: boolean; // move map mode
    mapConstrainZoom: boolean; // constrain zoom to chart min/max
    toolbarButtons: boolean; // show toolbar buttons (both left & right)
    invertColor: boolean; // invert feature label text color (for dark backgrounds)
    showCourseData: boolean; // show/hide course data
    showAisTargets: boolean; // show/hide AIS targets
    showNotes: boolean; // show/hide Notes
    autoNightMode: boolean;
  }>({
    mapNorthUp: true,
    mapMove: false,
    mapConstrainZoom: false,
    toolbarButtons: false,
    invertColor: false,
    showCourseData: true,
    showAisTargets: true,
    showNotes: true,
    autoNightMode: false
  });

  // Signal K server feature flags
  featureFlags = signal<{
    anchorApi: boolean;
    autopilotApi: boolean;
    weatherApi: boolean;
    radarApi: boolean;
    notificationApi: boolean;
    resourceGroups: boolean;
    resourceTracks: boolean;
    infoLayers: boolean;
    buddyList: boolean;
  }>({
    anchorApi: true, // default true until API is available
    autopilotApi: false,
    weatherApi: false,
    radarApi: false,
    notificationApi: false,
    resourceGroups: false, // ability to store resource groups
    resourceTracks: false, // ability to store track resources
    infoLayers: false, // ability to store map information overlays
    buddyList: false
  });

  selfTrail = signal<LineString>([]); // vessel trail from indexedDB
  selfTrailFromServer = signal<LineString>([]); // vessel trail from server
  mapExtent = signal<Extent>([]); // map viewport extent

  protected signalk = inject(SignalKClient);
  private worker = inject(SKWorkerService);
  private dialog = inject(MatDialog);
  private snackbar = inject(MatSnackBar);
  private iconReg = inject(MatIconRegistry);
  private dom = inject(DomSanitizer);
  private s57 = inject(S57Service);

  constructor() {
    /** Initialise and apply defaults */
    super(FSK);
    this.config = defaultConfig();
    this.data = initData();
    this.suppressPersist = true; //suppress persisting of config until doPostConfigLoad() is complete

    /** initialise IndexedDB and subscribe to events */
    this.db = new AppDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.db.dbUpdate$.subscribe((res: { action: string; value: any }) => {
      if (res.action) {
        switch (res.action) {
          case 'db_init':
            if (res.value) {
              if (this.config.vessels.trail) {
                this.db.getTrail().then((t) => {
                  this.selfTrail.update(() => (t && t.value ? t.value : []));
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

    /** Signal K server App config attributes */
    this.signalk.setAppId(FSK.id); // server stored config appId
    this.signalk.setAppVersion(SERVER_APPDATA_VERSION); // server stored app data version

    /** Initialise IconRegistry */
    this.initAppIcons();

    /** sets hostDef, kiosk flag and persists token */
    this.parseLaunchUrl();

    /** test for launch within iframe */
    this.instrumentPanelAvailable.update(() => this.isTopWindow());
    if (!this.isTopWindow()) {
      // listen for messages from parent
      window.addEventListener('message', (event) => {
        this.parseMessageFromParent(event);
      });
    }

    /** check for internet connection */
    this.testForInternet();

    /** Load persisted configuration */
    this.loadConfig();
    this.parseLoadedConfig();

    // respond to signals
    effect(() => {
      this.uiConfig();
      this.debug(`AppFacade.effect().uiConfig`, this.uiConfig());
      this.config.ui = this.uiConfig();
      this.saveConfig();
    });
  }

  /**
   * Process message from parent window to respond to configuration
   * requests
   * @param data MessageEvent data from parent
   */
  parseMessageFromParent(event: MessageEvent<ParentMessage>) {
    if (isDevMode() || event.origin === this.hostDef.url) {
      this.debug('parseMessageFromParent()', event.origin, event.data);
      const { settings, commands } = event.data;
      if (!settings && !commands) {
        this.debug('parseMessageFromParent() - invalid data!');
        return;
      }

      if (typeof settings?.autoNightMode === 'boolean') {
        // set auto night mode
        this.config.display.nightMode = settings.autoNightMode;
        this.uiConfig.update((current) => {
          return Object.assign({}, current, {
            autoNightMode: this.config.display.nightMode
          });
        });
      }

      if (typeof commands?.nightModeEnable === 'boolean') {
        // force dimming the display
        this.uiCtrl.update((current) => {
          return Object.assign({}, current, {
            forceNightMode: commands.nightModeEnable
          });
        });
      }
    } else {
      // We don't trust the sender of this message?
      this.debug('parseMessageFromParent() - untrusted origin!', event.origin);
      return;
    }
  }

  /** Parse, clean loaded config */
  private parseLoadedConfig() {
    cleanConfig(this.config, this.hostDef.params);
    this.doPostConfigLoad();
    this.s57.init(this.config.map.s57Options);
  }

  /** Initialise and raise "settings$.load" event */
  private doPostConfigLoad() {
    // initialise signals
    this.uiConfig.update(() => this.config.ui);
    if (this.config.vessels.fixedLocationMode) {
      this.data.vessels.self.position = [
        ...this.config.vessels.fixedPosition
      ] as Position;
      this.data.vessels.showSelf = true;
      this.config.map.center = [...this.config.vessels.fixedPosition];
    }

    this.sTrueMagChoice.set(this.config.units.headingAttribute);

    // emit settings$.ready
    this.debug(`doPostConfigLoad(): emit config$.ready`);
    this.emitConfigEvent('ready');
    this.suppressPersist = false; // allow persisting of config.
  }

  /** Retrieve and apply saved config from server */
  public loadSettingsfromServer() {
    this.signalk.isLoggedIn().subscribe(
      (r: boolean) => {
        this.isLoggedIn.set(r);
        if (r) {
          this.debug(
            'loadSettingsfromServer(): Is authenticated. Fetching config from SK Server...'
          );
          this.signalk.appDataGet('/').subscribe(
            (serverSettings: IAppConfig) => {
              if (Object.keys(serverSettings).length === 0) {
                return;
              }
              cleanConfig(serverSettings, this.hostDef.params);
              if (validateConfig(serverSettings)) {
                this.config = serverSettings;
                this.doPostConfigLoad();
                this.alignCustomResourcesPaths();
                this.saveConfig();
              }
            },
            () => {
              console.info(
                'applicationData: Unable to retrieve settings from server!'
              );
            }
          );
        } else {
          this.debug(
            'loadSettingsfromServer(): Not authenticated to SK Server!'
          );
        }
      },
      () => {
        this.isLoggedIn.set(false);
        this.debug('loadSettingsfromServer(): Error fetching loginStatus!');
      }
    );
  }

  /** Initialises Material IconRegistry with custom icons */
  private initAppIcons() {
    getSvgList().forEach((s: { id: string; path: string }) => {
      this.iconReg.addSvgIcon(
        s.id,
        this.dom.bypassSecurityTrustResourceUrl(s.path)
      );
    });
  }

  /** Parse window.location  and set hostDef & kiosk flag*/
  private parseLaunchUrl() {
    // process url params
    if (window.location.search) {
      const p = window.location.search.slice(1).split('&');
      p.forEach((i: string) => {
        const a = i.split('=');
        this.hostDef.params[a[0]] = a.length > 1 ? a[1] : null;
      });
    }

    // host name
    this.hostDef.name =
      typeof this.hostDef.params?.host !== 'undefined'
        ? this.hostDef.params.host
        : this.devMode && DEV_SERVER.host
          ? DEV_SERVER.host
          : window.location.hostname;

    this.hostDef.ssl =
      window.location.protocol === 'https:' || (this.devMode && DEV_SERVER.ssl)
        ? true
        : false;

    this.hostDef.port =
      typeof this.hostDef.params.port !== 'undefined'
        ? parseInt(this.hostDef.params.port)
        : this.devMode && DEV_SERVER.port
          ? DEV_SERVER.port
          : parseInt(window.location.port);

    // if no port specified then set to 80 | 443
    this.hostDef.port = isNaN(this.hostDef.port)
      ? this.hostDef.ssl
        ? 443
        : 80
      : this.hostDef.port;

    this.hostDef.url = `${this.hostDef.ssl ? 'https:' : 'http:'}//${
      this.hostDef.name
    }:${this.hostDef.port}`;

    // update kiosk flag
    this.kioskMode.update(() => {
      const k = typeof this.hostDef.params.kiosk !== 'undefined' ? true : false;
      return k;
    });

    //** persist token from url params
    if (typeof this.hostDef.params.token !== 'undefined') {
      this.persistToken(this.hostDef.params.token);
    }

    this.debug('host:', this.hostDef);
  }

  /** Test for / Warn if no Internet connection */
  private testForInternet() {
    window
      .fetch('https://tile.openstreetmap.org')
      .then(() => {
        console.info('Internet connection detected.');
      })
      .catch(() => {
        console.warn('No Internet connection detected!');
        const mapsel = this.config.selections.charts;
        if (mapsel.includes('openstreetmap') || mapsel.includes('openseamap')) {
          if (!this.kioskMode()) {
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

  /** returns true if not embedded (is top window)*/
  private isTopWindow(): boolean {
    try {
      return window.self === window.top;
    } catch (e) {
      return false;
    }
  }

  /** persist auth token for session */
  persistToken(value: string) {
    if (value) {
      this.signalk.authToken = value;
      this.worker.postMessage({
        cmd: 'auth',
        options: {
          token: value
        }
      });
      document.cookie = `sktoken=${value}; SameSite=Strict`;
      this.hasAuthToken.set(true); // hide login menu item
    } else {
      this.hasAuthToken.set(false); // show login menu item
      this.signalk.authToken = null;
      this.isLoggedIn.set(false);
      document.cookie = `sktoken=${null}; SameSite=Strict; max-age=0;`;
      this.worker.postMessage({
        cmd: 'auth',
        options: {
          token: null
        }
      });
    }
  }

  /** Start watching for change in skLoginInfo cookie */
  watchSKLogin() {
    if (this.watchingSKLogin) return;
    this.watchingSKLogin = window.setInterval(
      (() => {
        let lastCookie = this.getCookie(document.cookie, 'skLoginInfo');
        return () => {
          const currentCookie = this.getCookie(document.cookie, 'skLoginInfo');
          this.skAuthChange.set(currentCookie);
        };
      })(),
      2000
    );
  }

  /** return FB auth token for session */
  getFBToken(): string {
    return this.getCookie(document.cookie, 'sktoken');
  }

  /** return the requested cookie */
  private getCookie(cookies: string, sel: 'sktoken' | 'skLoginInfo') {
    if (!cookies) {
      return undefined;
    }
    const tk = new Map();
    cookies.split(';').forEach((i) => {
      const c = i.trim().split('=');
      tk.set(c[0], c[1]);
    });
    if (tk.has(sel)) {
      return tk.get(sel);
    } else {
      return undefined;
    }
  }

  /** return True / Magenetic preference */
  get useMagnetic(): boolean {
    return this.config.units.headingAttribute === 'navigation.headingMagnetic'
      ? true
      : false;
  }

  /** add point to self vessel track */
  addToSelfTrail(pt: Position) {
    this.selfTrail.update((current) => {
      if (current.length === 0) {
        return current;
      }
      const lastPoint = current.slice(-1)[0];
      if (pt[0] === lastPoint[0] && pt[1] === lastPoint[1]) {
        return current;
      }
      const st = [].concat(current);
      st.push(pt);
      return st;
    });
  }

  /** Calculate the position to center the map.
   * Tales into account the amount of offset to apply
   */
  calcMapCenter(ref: Position): Position {
    const ctrOfExtent: Position = GeoUtils.centreOfPolygon([
      this.mapExtent().slice(0, 2) as Position,
      [this.mapExtent()[0], this.mapExtent()[3]],
      this.mapExtent().slice(-2) as Position,
      [this.mapExtent()[2], this.mapExtent()[1]],
      this.mapExtent().slice(0, 2) as Position
    ]);
    const offsetDistance =
      GeoUtils.distanceTo(this.mapExtent().slice(0, 2) as Position, [
        this.mapExtent()[0],
        ctrOfExtent[1]
      ]) * (this.config.map.centerOffset ?? 0.5);
    const pos: Position = true //this.app.config.display.mapCenterOffset ?
      ? GeoUtils.destCoordinate(
          this.data.vessels.active.position,
          0,
          offsetDistance
        )
      : ref;
    return pos;
  }

  /**
   * @description Align selected custom resource paths with those enabled on the server.
   */
  alignCustomResourcesPaths() {
    this.signalk.api
      .get(this.skApiVersion, '/resources')
      .subscribe((res: { [key: string]: { description: string } }) => {
        const paths = Object.keys(res).filter(
          (i) => !this.IGNORE_RESOURCES.includes(i)
        );
        this.config.resources.paths = this.config.resources.paths.filter((k) =>
          paths.includes(k)
        );
      });
  }

  /** overloaded saveConfig() */
  override saveConfig() {
    super.saveConfig();
    if (this.isLoggedIn()) {
      this.signalk.appDataSet('/', this.config).subscribe(
        () => this.debug('saveConfig: config saved to server.'),
        () => this.debug('saveConfig: Cannot save config to server!')
      );
    }
  }

  /** show Help at specified anchor */
  showHelp(anchor?: string) {
    const url = `./assets/help/index.html${anchor ? '#' + anchor : ''}`;
    window.open(url, 'help');
  }

  /** display Welcome dialog */
  showWelcome() {
    let btnText = 'Get Started';
    const messages = [];
    let showPrefs = false;

    if (
      !this.kioskMode() &&
      ['first_run', 'major', 'minor'].includes(this.launchStatus.result)
    ) {
      if (this.launchStatus.result === 'first_run') {
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

  // ** display MsgBox dialog
  showMsgBox(title: string, message: string, btn?: string) {
    return this.dialog
      .open(MsgBox, {
        disableClose: false,
        data: {
          message: message,
          title: title,
          buttonText: btn
        }
      })
      .afterClosed();
  }

  /** display alert dialog */
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

  /** display error list dialog */
  showErrorList(errList: ErrorList, btn?: string) {
    return this.dialog
      .open(ErrorListDialog, {
        disableClose: false,
        data: {
          errorList: errList,
          buttonText: btn
        }
      })
      .afterClosed();
  }

  /** display message bar */
  showMessage(message: string, sound = false, duration = 5000) {
    this.snackbar.openFromComponent(MessageBarComponent, {
      duration: duration,
      data: { message: message, sound: sound }
    });
  }

  /** display confirm dialog */
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

  /**
   * @description Parse and display error message
   * @param err Error response
   */
  parseHttpErrorResponse(err: HttpErrorResponse) {
    let msg: string = '';
    if (err.status && [401, 403].includes(err.status)) {
      // unauthorised / forbidden
      msg =
        'Signal K server requires authentication to update resources.\nPlease login and try again.\n';
    } else {
      msg = 'Operation could not be completed!\n';
    }
    this.showAlert(
      `${err.status}: ${err.statusText}`,
      msg + `${err.error?.message}`
    );
  }

  /** returns a formatted string containing the value (converted to the preferred units)
   * and units. (e.g. 12.5 knots, 8.8 m/s)
   * Numbers are fixed to 1 decimal point unless precision is specified
   */
  formatValueForDisplay(
    value: number,
    sourceUnits: 'K' | 'm/s' | 'rad' | 'm' | 'ratio' | 'deg',
    depthValue?: boolean,
    precision: number = 1
  ): string {
    if (typeof value === 'number') {
      if (sourceUnits === 'K') {
        return this.config.units.temperature === 'c'
          ? `${Convert.kelvinToCelsius(value).toFixed(
              precision
            )}${String.fromCharCode(186)}C`
          : `${Convert.kelvinToFarenheit(value).toFixed(
              1
            )}${String.fromCharCode(186)}F`;
      } else if (sourceUnits === 'ratio') {
        return Math.abs(value) <= 1
          ? `${(value * 100).toFixed(precision)}%`
          : value.toFixed(4);
      } else if (sourceUnits === 'rad') {
        return `${Convert.radiansToDegrees(value).toFixed(
          1
        )}${String.fromCharCode(186)}`;
      } else if (sourceUnits === 'deg') {
        return `${value.toFixed(precision)}${String.fromCharCode(186)}`;
      } else if (sourceUnits === 'm') {
        if (depthValue) {
          return this.config.units.depth === 'm'
            ? `${value.toFixed(precision)} m`
            : `${Convert.metersToFeet(value).toFixed(precision)} ft`;
        } else {
          if (this.config.units.distance !== 'ft') {
            return value < 1000
              ? `${value.toFixed(Math.floor(value) === 0 ? precision : 0)} m`
              : `${(value / 1000).toFixed(precision)} km`;
          } else {
            const nm = Convert.kmToNauticalMiles(value / 1000);
            return nm < 0.5
              ? this.formatValueForDisplay(value, 'm', true)
              : `${nm.toFixed(precision)} NM`;
          }
        }
      } else if (sourceUnits === 'm/s') {
        switch (this.config.units.speed) {
          case 'kmh':
            return `${Convert.msecToKmh(value).toFixed(precision)} km/h`;
          case 'kn':
            return `${Convert.msecToKnots(value).toFixed(precision)} knots`;
          case 'mph':
            return `${Convert.msecToMph(value).toFixed(precision)} mph`;
          default:
            return `${value} ${sourceUnits}`;
        }
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
