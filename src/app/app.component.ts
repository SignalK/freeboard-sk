import { Component, ViewChild, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Observable, Subject } from 'rxjs';

import { AppFacade } from './app.facade';
import { SettingsMessage } from './lib/services';
import {
  AboutDialog,
  LoginDialog,
  PlaybackDialog,
  GeoJSONImportDialog,
  Trail2RouteDialog
} from 'src/app/lib/components/dialogs';

import {
  AISPropertiesModal,
  AtoNPropertiesModal,
  AircraftPropertiesModal,
  ActiveResourcePropertiesModal,
  ResourceImportDialog,
  ResourceSetModal,
  ResourceSetFeatureModal,
  SettingsDialog,
  SKStreamFacade,
  SKSTREAM_MODE,
  StreamOptions,
  AnchorFacade,
  SKResources,
  SKVessel,
  SKSaR,
  SKAircraft,
  SKAtoN,
  SKOtherResources,
  SKRegion,
  WeatherForecastModal,
  CourseSettingsModal,
  NotificationManager,
  GPXImportDialog,
  GPXExportDialog
} from 'src/app/modules';

import { SignalKClient } from 'signalk-client-angular';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import * as semver from 'semver';

import {
  NotificationMessage,
  UpdateMessage,
  LineString,
  Polygon,
  FBRoute,
  Position,
  ErrorList
} from './types';
import { Feature } from 'ol';

interface DrawEndEvent {
  coordinates: LineString | Position | Polygon;
  enabled: boolean;
  features: Feature[];
  forSave: boolean;
  mode: string;
  modify: false;
  properties: { [key: string]: unknown };
  type: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent {
  @ViewChild('sideright', { static: false }) sideright;

  public display = {
    fullscreen: { active: false, enabled: document.fullscreenEnabled },
    leftMenuPanel: false,
    instrumentPanelOpen: true,
    instrumentAppActive: true,
    routeList: false,
    waypointList: false,
    chartList: false,
    noteList: false,
    trackList: false,
    aisList: false,
    anchorWatch: false,
    navDataPanel: {
      show: false,
      nextPointCtrl: false,
      apModeColor: '',
      apModeText: ''
    },
    playback: { time: null },
    map: { center: [0, 0], setFocus: false },
    audio: { state: '' }
  };

  public draw = {
    enabled: false,
    mode: null,
    type: null,
    modify: false,
    modifyMode: null,
    forSave: null,
    properties: {}
  };

  public measure = { enabled: false };

  // APP features / mode
  public features = { playbackAPI: true };
  public mode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME; // current mode

  private timers = [];

  // external resources
  private lastInstUrl: string;
  private lastInstParams: string;
  public instUrl: SafeResourceUrl;
  private lastVideoUrl: string;
  private selFavourite = -1;
  public vidUrl: SafeResourceUrl;

  public convert = Convert;
  private obsList = []; // observables array
  private streamOptions = { options: null, toMode: null };

  constructor(
    public app: AppFacade,
    protected anchor: AnchorFacade,
    protected notiMgr: NotificationManager,
    private stream: SKStreamFacade,
    public skres: SKResources,
    public skresOther: SKOtherResources,
    public signalk: SignalKClient,
    private dom: DomSanitizer,
    private overlayContainer: OverlayContainer,
    private bottomSheet: MatBottomSheet,
    private dialog: MatDialog
  ) {
    // set self to active vessel
    this.app.data.vessels.active = this.app.data.vessels.self;

    // handle signals
    effect(() => {
      this.app.debug('** sMapNorthUp:', this.app.sMapNorthUp());
    });
  }

  // ********* LIFECYCLE ****************

  ngAfterViewInit() {
    setTimeout(() => {
      const wr = this.app.showWelcome();
      if (wr) {
        wr.afterClosed().subscribe((r) => {
          if (r) this.openSettings();
        });
      }
    }, 500);
  }

  enableAudio() {
    if (this.app.audio.context) {
      this.app.audio.context.resume();
    }
  }

  handleHasWakeLock(value: boolean) {
    setTimeout(() => (this.app.data.hasWakeLock = value), 500);
  }

  handleWakelockChange(value: boolean) {
    this.app.config.selections.wakeLock = value;
    this.app.saveConfig();
  }

  ngOnInit() {
    // ** audio context handing **
    this.display.audio.state = this.app.audio.context.state;
    this.app.debug('audio state:', this.display.audio.state);
    this.app.audio.context.onstatechange = () => {
      this.app.debug('audio statechange:', this.app.audio.context.state);
      this.display.audio.state = this.app.audio.context.state;
    };

    // ** apply loaded app config
    this.display.map.center = this.app.config.map.center;
    if (this.app.config.plugins.startOnOpen) {
      this.display.instrumentAppActive = false;
    }

    // overlay dark-theme
    this.setDarkTheme();

    this.lastInstUrl = this.app.config.plugins.instruments;
    this.lastInstParams = this.app.config.plugins.parameters;
    this.instUrl = this.dom.bypassSecurityTrustResourceUrl(
      this.formatInstrumentsUrl()
    );
    this.lastVideoUrl = this.app.config.resources.video.url;
    this.vidUrl = this.dom.bypassSecurityTrustResourceUrl(
      `${this.app.config.resources.video.url}`
    );

    // ** connect to signalk server and intialise
    this.connectSignalKServer();

    // ********************* SUBSCRIPTIONS *****************
    // ** SIGNAL K STREAM **
    this.obsList.push(
      this.app.skLogin$.subscribe({
        next: (token: string) => {
          this.app.debug('SK Login Event', token);
          this.handleSKLoginEvent();
        }
      })
    );
    this.obsList.push(
      this.stream
        .delta$()
        .subscribe((msg: NotificationMessage | UpdateMessage) =>
          this.onMessage(msg)
        )
    );
    this.obsList.push(
      this.stream
        .connect$()
        .subscribe((msg: NotificationMessage | UpdateMessage) =>
          this.onConnect(msg)
        )
    );
    this.obsList.push(
      this.stream
        .close$()
        .subscribe((msg: NotificationMessage | UpdateMessage) =>
          this.onClose(msg)
        )
    );
    this.obsList.push(
      this.stream
        .error$()
        .subscribe((msg: NotificationMessage | UpdateMessage) =>
          this.onError(msg)
        )
    );
    this.obsList.push(
      this.stream.trail$().subscribe((msg) => this.handleResourceUpdate(msg))
    );
    // ** RESOURCES update event
    this.obsList.push(
      this.skres
        .update$()
        .subscribe((value) => this.handleResourceUpdate(value))
    );
    // ** SETTINGS - handle settings load / save events
    this.obsList.push(
      this.app.settings$.subscribe((value: SettingsMessage) =>
        this.handleSettingsEvent(value)
      )
    );

    // fullscreen event handlers
    document.addEventListener('fullscreenchange', () => {
      //console.log(document.fullscreenElement)
      if (document.fullscreenElement) {
        this.display.fullscreen.active = true;
      } else {
        this.display.fullscreen.active = false;
      }
    });
    document.addEventListener('fullscreenerror', (e) => {
      console.warn(e);
      this.display.fullscreen.active = false;
    });
  }

  ngOnDestroy() {
    // ** clean up
    this.stopTimers();
    this.stream.terminate();
    this.signalk.disconnect();
    this.obsList.forEach((i) => i.unsubscribe());
  }

  // ********* DISPLAY / APPEARANCE ****************

  // ** return the map orientation **
  getOrientation() {
    return this.app.config.map.northUp
      ? 'rotate(' + 0 + 'deg)'
      : 'rotate(' + (0 - this.app.data.vessels.active.orientation) + 'rad)';
  }

  public toggleToolbarButtons() {
    this.app.config.toolBarButtons = !this.app.config.toolBarButtons;
    this.app.saveConfig();
    this.focusMap();
  }

  public toggleAlertList(show: boolean) {
    this.app.sAlertListShow.set(show);
  }

  public toggleLimitMapZoom() {
    this.app.config.map.limitZoom = this.app.config.map.limitZoom
      ? false
      : true;
    this.skres.setMapZoomRange();
    this.app.saveConfig();
    this.focusMap();
  }

  public invertAISTextColor() {
    this.app.config.map.invertColor = this.app.config.map.invertColor
      ? false
      : true;
    this.app.saveConfig();
    this.focusMap();
  }

  public toggleFullscreen() {
    const docel = document.documentElement;
    const fscreen =
      docel.requestFullscreen ||
      docel['webkitRequestFullScreen'] ||
      docel['mozRequestFullscreen'] ||
      docel['msRequestFullscreen'];
    if (fscreen) {
      if (!document.fullscreenElement) {
        fscreen.call(docel);
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
      this.focusMap();
    }
  }

  private setDarkTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (
      (this.app.config.darkMode.source === 0 && mq.matches) ||
      (this.app.config.darkMode.source === 1 &&
        this.app.data.vessels.self.mode === 'night') ||
      this.app.config.darkMode.source === -1
    ) {
      this.overlayContainer.getContainerElement().classList.add('dark-theme');
      this.app.config.darkMode.enabled = true;
    } else {
      this.overlayContainer
        .getContainerElement()
        .classList.remove('dark-theme');
      this.app.config.darkMode.enabled = false;
    }
  }

  private formatInstrumentsUrl() {
    const url = `${this.app.host}${this.app.config.plugins.instruments}`;
    const params = this.app.config.plugins.parameters
      ? this.app.config.plugins.parameters.length > 0 &&
        this.app.config.plugins.parameters[0] !== '?'
        ? `?${this.app.config.plugins.parameters}`
        : this.app.config.plugins.parameters
      : '';
    return params ? `${url}/${params}` : url;
  }

  // ** select prev/next favourite plugin **
  public selectPlugin(next = false) {
    if (next) {
      if (this.selFavourite === -1) {
        this.selFavourite = 0;
      } else if (
        this.selFavourite ===
        this.app.config.selections.pluginFavourites.length - 1
      ) {
        this.selFavourite = -1;
      } else {
        this.selFavourite++;
      }
    } else {
      if (this.selFavourite === -1) {
        this.selFavourite =
          this.app.config.selections.pluginFavourites.length - 1;
      } else if (this.selFavourite === 0) {
        this.selFavourite = -1;
      } else {
        this.selFavourite--;
      }
    }
    const url =
      this.selFavourite === -1
        ? this.formatInstrumentsUrl()
        : `${this.app.host}${
            this.app.config.selections.pluginFavourites[this.selFavourite]
          }`;

    this.instUrl = this.dom.bypassSecurityTrustResourceUrl(url);
  }

  // ** handle map context menu selections **
  public handleContextMenuSelection(action: string) {
    switch (action) {
      case 'cleartrail':
        this.clearTrail(this.app.data.serverTrail);
        break;
      case 'trail2route':
        this.trailToRoute();
        break;
      case 'cleardestination':
        this.clearDestination();
        break;
      case 'anchor':
        this.displayLeftMenu('anchorWatch', true);
        break;
      case 'weather_forecast':
        this.showWeather('forecast');
        break;
    }
  }
  // ** create route from vessel trail **
  public trailToRoute() {
    this.dialog
      .open(Trail2RouteDialog, {
        disableClose: true,
        data: { trail: this.app.data.trail }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          this.skres.showRouteNew({ coordinates: r.data });
        }
        this.focusMap();
      });
  }

  public showWeather(mode: string) {
    if (mode === 'forecast') {
      this.bottomSheet
        .open(WeatherForecastModal, {
          disableClose: true,
          data: { title: 'Forecast' }
        })
        .afterDismissed()
        .subscribe(() => {
          this.focusMap();
        });
    }
  }

  // display selected experiment UI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public openExperiment(e: { choice: string; value?: any }) {
    switch (e.choice) {
      case 'debugCapture':
        if (window.isSecureContext) {
          navigator.clipboard.writeText(
            JSON.stringify({
              data: this.app.data,
              config: this.app.config
            })
          );
          this.app.showMessage('Debug data catpured to clipboard.');
        } else {
          this.app.showAlert(
            'Feature Unavailable',
            'This feature is only available in a secure context!\n e.g. https, http://localhost, http://127.0.0.1'
          );
        }
        break;
      default:
        // resource set
        if (this.app.config.resources.paths.includes(e.choice)) {
          this.bottomSheet
            .open(ResourceSetModal, {
              disableClose: true,
              data: { path: e.choice, skres: this.skresOther }
            })
            .afterDismissed()
            .subscribe(() => {
              this.focusMap();
            });
        }
    }
  }

  // ** display course settings screen **
  public openCourseSettings() {
    this.bottomSheet
      .open(CourseSettingsModal, {
        disableClose: true,
        data: { title: 'Course Settings' }
      })
      .afterDismissed()
      .subscribe(() => {
        this.focusMap();
      });
  }

  // ************************************************
  handleSKLoginEvent() {
    this.signalk.getLoginStatus().subscribe((r) => {
      this.app.data.loginRequired = r.authenticationRequired ?? false;
      this.app.data.loggedIn = r.status === 'loggedIn' ? true : false;
      // ** Request using cached auth token and display badge
      this.signalk.get('/plugins/freeboard-sk').subscribe(
        () => {
          this.app.debug('User Authenticated');
          this.app.data.loggedIn = true;
        },
        (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.app.debug('User NOT Authenticated');
            this.app.data.loggedIn = false;
          }
        }
      );
    });
  }

  // ** establish connection to server
  private connectSignalKServer() {
    this.app.data.selfId = null;
    this.app.data.server = null;
    this.signalk.proxied = this.app.config.selections.signalk.proxied;
    this.signalk
      .connect(this.app.hostName, this.app.hostPort, this.app.hostSSL)
      .subscribe(
        () => {
          this.signalk.authToken = this.app.getFBToken();
          this.app.watchSKLogin();
          this.handleSKLoginEvent();

          this.app.loadSettingsfromServer().subscribe((r) => {
            const msg = r
              ? 'Settings loaded from server.'
              : 'Error loading Settings from server!';
            console.log(msg);
            if (r) {
              this.skres.alignResourceSelections();
            }
          });

          this.getFeatures();
          this.app.data.server = this.signalk.server.info;
          this.openSKStream();
        },
        () => {
          this.app.showMessage(
            'Unable to contact Signal K server! (Retrying in 5 secs)',
            false,
            5000
          );
          setTimeout(() => this.connectSignalKServer(), 5000);
        }
      );
  }

  // ** discover server features **
  private getFeatures() {
    // check server features
    this.signalk.get('/signalk/v2/features?enabled=1').subscribe(
      (res: {
        apis: string[];
        plugins: Array<{ id: string; version: string }>;
      }) => {
        // detect apis
        this.app.data.weather.hasApi = res.apis.includes('weather');
        this.app.data.autopilot.hasApi = res.apis.includes('autopilot');

        // detect plugins
        const hasPlugin = {
          charts: false,
          pmTiles: false
        };
        this.app.data.anchor.hasApi = false;
        res.plugins.forEach((p: { id: string; version: string }) => {
          // anchor alarm
          if (p.id === 'anchoralarm') {
            this.app.debug('*** found anchoralarm plugin');
            this.app.data.anchor.hasApi = true;
          }
          // buddy list
          if (p.id === 'signalk-buddylist-plugin') {
            this.app.debug('*** found buddylist plugin');
            this.app.data.buddyList.hasApi = semver.satisfies(
              p.version,
              '>1.2.0'
            )
              ? true
              : false;
          }
          // charts v2 api support
          if (p.id === 'charts') {
            this.app.debug('*** found charts plugin');
            hasPlugin.charts = true;
            if (
              semver.satisfies(p.version, '>=3.0.0') &&
              this.app.config.chartApi === 1
            ) {
              this.app.config.chartApi = 2;
            }
          }
          // PMTiles support
          if (p.id === 'signalk-pmtiles-plugin') {
            this.app.debug('*** found PMTiles plugin');
            hasPlugin.pmTiles = true;
          }
        });
        // finalise
        if (hasPlugin.pmTiles && !hasPlugin.charts) {
          this.app.config.chartApi = 2;
        }
      },
      () => {
        this.app.debug('*** Features API not present!');
        this.app.data.anchor.hasApi = true;
      }
    );
  }

  // ** start trail / AIS timers
  private startTimers() {
    // ** start trail logging interval timer
    this.app.debug(`Starting Trail logging timer...`);
    this.timers.push(
      setInterval(() => {
        this.processTrail();
      }, 5000)
    );
  }
  // ** stop timers
  private stopTimers() {
    this.app.debug(`Stopping timers:`);
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }

  // ** process local vessel trail **
  private processTrail(trailData?) {
    if (!this.app.config.selections.vessel.trail) {
      return;
    }
    // ** update vessel trail **
    const t = this.app.data.trail.slice(-1);
    if (this.app.data.vessels.showSelf) {
      if (t.length === 0) {
        this.app.data.trail.push(this.app.data.vessels.self.position);
        return;
      }
      if (
        this.app.data.vessels.self.position[0] !== t[0][0] ||
        this.app.data.vessels.self.position[1] !== t[0][1]
      ) {
        this.app.data.trail.push(this.app.data.vessels.self.position);
      }
    }
    if (!trailData || trailData.length === 0) {
      // no server trail data supplied
      if (this.app.data.trail.length % 60 === 0 && this.app.data.serverTrail) {
        if (this.app.config.selections.trailFromServer) {
          this.skres.getVesselTrail(); // request trail from server
        }
      }
      this.app.data.trail = this.app.data.trail.slice(-5000);
    } else {
      // use server trail data, keep minimal local trail data
      const lastseg = trailData.slice(-1);
      const lastpt =
        lastseg.length !== 0
          ? lastseg[0].slice(-1)
          : trailData.length > 1
          ? trailData[trailData.length - 2].slice(-1)
          : [];
      this.app.data.trail = lastpt;
    }
    const trailId = this.mode === SKSTREAM_MODE.PLAYBACK ? 'history' : 'self';
    this.app.db.saveTrail(trailId, this.app.data.trail);
  }

  // ** RESOURCES event handlers **
  private handleResourceUpdate(e) {
    // ** handle routes get and update NavData based on activeRoute
    if (e.action === 'get' && e.mode === 'route') {
      //this.updateNavPanel(e);
    }
    // ** trail retrieved from server **
    if (e.action === 'get' && e.mode === 'trail') {
      this.processTrail(e.data);
    }
    // ** create note in group **
    if (e.action === 'new' && e.mode === 'note') {
      if (this.app.config.resources.notes.groupRequiresPosition) {
        this.drawStart(e.mode, { group: e.group });
      } else {
        this.skres.showNoteEditor({ group: e.group });
      }
    }
  }

  // ** SETTINGS event handler **
  private handleSettingsEvent(e: SettingsMessage) {
    this.app.debug(`App: settings.update$`, 'warn');
    if (e.action === 'load' && e.setting === 'config') {
      this.app.data.trueMagChoice = this.app.config.selections.headingAttribute;
    }
    if (e.action === 'save' && e.setting === 'config') {
      this.setDarkTheme(); // **  set theme **
      if (
        this.app.data.trueMagChoice !==
        this.app.config.selections.headingAttribute
      ) {
        this.app.debug('True / Magnetic selection changed..');
        this.app.data.vessels.self.heading = this.app.useMagnetic
          ? this.app.data.vessels.self.headingMagnetic
          : this.app.data.vessels.self.headingTrue;
        this.app.data.vessels.self.cog = this.app.useMagnetic
          ? this.app.data.vessels.self.cogMagnetic
          : this.app.data.vessels.self.cogTrue;
        this.app.data.vessels.self.wind.direction = this.app.useMagnetic
          ? this.app.data.vessels.self.wind.mwd
          : this.app.data.vessels.self.wind.twd;

        this.app.data.vessels.aisTargets.forEach((v) => {
          v.heading = this.app.useMagnetic ? v.headingMagnetic : v.headingTrue;
          v.cog = this.app.useMagnetic ? v.cogMagnetic : v.cogTrue;
          v.wind.direction = this.app.useMagnetic ? v.wind.mwd : v.wind.twd;
        });
        this.app.data.trueMagChoice =
          this.app.config.selections.headingAttribute;
      }

      if (
        this.lastInstUrl !== this.app.config.plugins.instruments ||
        this.lastInstParams !== this.app.config.plugins.parameters
      ) {
        this.lastInstUrl = this.app.config.plugins.instruments;
        this.lastInstParams = this.app.config.plugins.parameters;
        this.instUrl = this.dom.bypassSecurityTrustResourceUrl(
          this.formatInstrumentsUrl()
        );
      }
      if (this.lastVideoUrl !== this.app.config.resources.video.url) {
        this.lastVideoUrl = this.app.config.resources.video.url;
        this.vidUrl = this.dom.bypassSecurityTrustResourceUrl(
          `${this.app.config.resources.video.url}`
        );
      }
      // ** trail **
      if (this.app.config.selections.vessel.trail) {
        // show trail
        if (this.app.config.selections.trailFromServer) {
          this.skres.getVesselTrail();
        } else {
          this.app.data.serverTrail = false;
        }
      }
    }
    // update instrument app state
    if (this.app.config.plugins.startOnOpen) {
      if (!this.display.instrumentPanelOpen) {
        this.display.instrumentAppActive = false;
      }
    } else {
      this.display.instrumentAppActive = true;
    }
  }

  // ** trigger focus of the map so keyboard controls work
  public focusMap() {
    this.display.map.setFocus = true;
    // reset value to ensure change detection
    setTimeout(() => {
      this.display.map.setFocus = false;
    }, 1000);
  }

  // ********* SIDENAV ACTIONS *************

  public rightSideNavAction(e: boolean) {
    this.display.instrumentPanelOpen = e;
    if (this.app.config.plugins.startOnOpen) {
      this.display.instrumentAppActive = e;
    }
    if (!e) {
      this.focusMap();
    } // set when closed
  }

  public displayLeftMenu(menulist = '', show = false) {
    this.display.leftMenuPanel = show;
    this.display.routeList = false;
    this.display.waypointList = false;
    this.display.chartList = false;
    this.display.noteList = false;
    this.display.trackList = false;
    this.display.aisList = false;
    this.display.anchorWatch = false;
    switch (menulist) {
      case 'routeList':
        this.display.routeList = show;
        break;
      case 'waypointList':
        this.display.waypointList = show;
        break;
      case 'chartList':
        this.display.chartList = show;
        break;
      case 'noteList':
        this.display.noteList = show;
        break;
      case 'trackList':
        this.display.trackList = show;
        break;
      case 'anchorWatch':
        this.display.anchorWatch = show;
        break;
      case 'aisList':
        this.display.aisList = show;
        break;
      default:
        this.display.leftMenuPanel = false;
    }
    if (!show) {
      this.focusMap();
    }
  }

  // ********* MAIN MENU ACTIONS *************

  // ** open about dialog **
  public openAbout() {
    this.dialog
      .open(AboutDialog, {
        disableClose: false,
        data: {
          name: this.app.name,
          version: this.app.plugin.version,
          description: this.app.description,
          logo: this.app.logo,
          url: this.app.url
        }
      })
      .afterClosed()
      .subscribe(() => this.focusMap());
  }

  // ** open settings dialog **
  public openSettings() {
    this.dialog
      .open(SettingsDialog, {
        disableClose: true,
        data: {},
        maxWidth: '90vw',
        minWidth: '90vw'
      })
      .afterClosed()
      .subscribe((doSave) => {
        this.focusMap();
        if (doSave) {
          this.app.saveConfig();
        }
      });
  }

  /** GPX / GeoJSON imports */
  public importFile(f: { data: string | ArrayBuffer; name: string }) {
    if ((f.data as string).indexOf('<gpx ') !== -1) {
      this.processGPX(f);
    } else if (
      (f.data as string).indexOf(`"type": "FeatureCollection",`) !== -1
    ) {
      this.processGeoJSON(f);
    } else {
      this.app.showAlert('Import', 'File format not supported!');
    }
    this.focusMap();
  }

  /** process GPX file */
  public processGPX(f: { data: string | ArrayBuffer; name: string }) {
    this.dialog
      .open(GPXImportDialog, {
        disableClose: true,
        data: {
          fileData: f.data,
          fileName: f.name
        }
      })
      .afterClosed()
      .subscribe((res: { errCount: number; errList: ErrorList }) => {
        if (typeof res.errCount === 'undefined' || res.errCount < 0) {
          // cancelled
          this.focusMap();
          return;
        }
        this.fetchResources();
        if (res.errCount === 0) {
          this.app.showMsgBox(
            'GPX Load',
            'GPX file resources loaded successfully.'
          );
        } else {
          this.app.showErrorList(res.errList);
        }
        this.focusMap();
      });
  }

  /** Export resources to GPX file */
  public exportToGPX() {
    this.dialog
      .open(GPXExportDialog, {
        disableClose: true,
        data: {
          routes: this.app.data.routes,
          waypoints: this.app.data.waypoints,
          tracks: [this.app.data.trail]
        }
      })
      .afterClosed()
      .subscribe((errCount) => {
        if (errCount < 0) {
          // cancelled
          this.focusMap();
          return;
        }
        if (errCount === 0) {
          this.app.showMsgBox(
            'GPX Save',
            'Resources saved to GPX file successfully.'
          );
        } else {
          this.app.showAlert('GPX Save', 'Error saving resources to GPX file!');
        }
        this.focusMap();
      });
  }

  /** process GeoJSON file */
  processGeoJSON(f: { data: string | ArrayBuffer; name: string }) {
    this.dialog
      .open(GeoJSONImportDialog, {
        disableClose: true,
        data: {
          fileData: f.data,
          fileName: f.name
        }
      })
      .afterClosed()
      .subscribe((errCount) => {
        if (errCount < 0) {
          return;
        } // cancelled
        this.fetchResources();
        if (errCount === 0) {
          this.app.showMsgBox(
            'GeoJSON Load',
            'GeoJSON features loaded successfully.'
          );
        } else {
          this.app.showAlert(
            'GeoJSON Load',
            'Completed with errors!\nNot all features were loaded.'
          );
        }
        this.focusMap();
      });
  }

  /** Import ResourceSet */
  importResourceSet() {
    this.dialog
      .open(ResourceImportDialog, {
        disableClose: true,
        data: {}
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) {
          return;
        } // cancelled
        try {
          const d = JSON.parse(res.data);
          this.skres.postResource(res.path, d);
        } catch (err) {
          this.app.showAlert(
            'Load Resource',
            'Resources were not loaded!\nInvalid JSON.'
          );
        }
        this.focusMap();
      });
  }

  // ** show login dialog **
  public showLogin(
    message?: string,
    cancelWarning = true,
    onConnect?: boolean
  ): Observable<boolean> {
    const lis: Subject<boolean> = new Subject();
    this.dialog
      .open(LoginDialog, {
        disableClose: true,
        data: { message: message || 'Login to Signal K server.' }
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res.cancel) {
          this.signalk.login(res.user, res.pwd).subscribe(
            (r) => {
              // ** authenticated
              this.app.persistToken(r['token']);
              this.app.loadSettingsfromServer().subscribe((r) => {
                const msg = r
                  ? 'Settings loaded from server.'
                  : 'Error loading Settings from server!';
                console.log(msg);
                if (r) {
                  this.skres.alignResourceSelections();
                }
              });
              if (onConnect) {
                this.queryAfterConnect();
              }
              this.app.data.loggedIn = true;
              lis.next(true);
            },
            () => {
              // ** auth failed
              this.app.persistToken(null);
              this.signalk.isLoggedIn().subscribe((r) => {
                this.app.data.loggedIn = r;
              });
              if (onConnect) {
                this.app
                  .showConfirm(
                    'Invalid Username or Password.',
                    'Authentication Failed:',
                    'Try Again'
                  )
                  .subscribe(() => {
                    this.showLogin(null, false, true);
                  });
              } else {
                this.app
                  .showConfirm(
                    'Invalid Username or Password.\nNote: Choosing CLOSE may make operations requiring authentication unavailable.',
                    'Authentication Failed:',
                    'Try Again',
                    'Close'
                  )
                  .subscribe((r) => {
                    if (r) {
                      this.showLogin();
                    }
                  });
              }
            }
          );
        } else {
          this.app.data.hasToken = false; // show login menu item
          this.signalk.isLoggedIn().subscribe((r: boolean) => {
            this.app.data.loggedIn = r;
          });
          if (onConnect) {
            this.showLogin(null, false, true);
          } else {
            if (cancelWarning) {
              this.app.showAlert(
                'Login Cancelled:',
                `Update operations are NOT available until you have authenticated to the Signal K server.`
              );
            }
            lis.next(false);
          }
        }
        this.focusMap();
      });
    return lis.asObservable();
  }

  public showPlaybackSettings() {
    this.dialog
      .open(PlaybackDialog, {
        disableClose: false
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          // OK: switch to playback mode
          this.switchMode(SKSTREAM_MODE.PLAYBACK, r.query);
        } else {
          // cancel: restarts realtime mode
          this.switchMode(SKSTREAM_MODE.REALTIME);
        }
        this.focusMap();
      });
  }

  // ********** TOOLBAR ACTIONS **********

  public toggleMoveMap(exit = false) {
    const doSave: boolean = !this.app.config.map.moveMap && exit ? false : true;
    this.app.config.map.moveMap = exit ? false : !this.app.config.map.moveMap;
    if (doSave) {
      this.app.saveConfig();
    }
  }

  public toggleNorthUp() {
    this.app.sMapNorthUp.update((nup) => {
      this.app.config.map.northUp = !nup;
      this.app.saveConfig();
      return this.app.config.map.northUp;
    });
  }

  // ***** EDIT MENU ACTONS *******

  // ** Enter Draw mode **
  public drawStart(mode: string, props?) {
    this.draw.properties = props && props.group ? props : {};
    this.draw.mode = mode;
    this.draw.enabled = true;
    this.app.data.map.suppressContextMenu = true;
  }

  // ** Enter Measure mode **
  public measureStart() {
    this.measure.enabled = true;
    this.app.data.map.suppressContextMenu = true;
  }

  public measureEnd() {
    this.measure.enabled = false;
    this.app.data.measurement = { coords: [], index: -1 };
    this.app.data.map.suppressContextMenu = false;
  }

  // ***** OPTIONS MENU ACTONS *******

  public centerResource(position: [number, number], zoomTo?: number) {
    position[0] += 0.0000000000001;
    this.display.map.center = position;
    if (typeof zoomTo === 'number') {
      this.app.config.map.zoomLevel = zoomTo;
    }
  }

  public centerVessel() {
    const t = this.app.data.vessels.active.position;
    t[0] += 0.0000000000001;
    this.display.map.center = t;
  }

  public toggleAisTargets() {
    this.app.config.aisTargets = !this.app.config.aisTargets;
    if (this.app.config.aisTargets) {
      this.processAIS(true);
    }
    this.app.saveConfig();
  }

  public toggleCourseData() {
    this.app.config.courseData = !this.app.config.courseData;
    this.app.saveConfig();
  }

  public toggleNotes() {
    this.app.config.notes = !this.app.config.notes;
    this.app.saveConfig();
  }

  // ** delete vessel trail **
  public clearTrail(noprompt = false) {
    if (noprompt) {
      if (!this.app.data.serverTrail) {
        this.app.data.trail = [];
      } else {
        if (this.app.config.selections.trailFromServer) {
          this.skres.getVesselTrail(); // request trail from server
        }
      }
    } else {
      if (!this.app.data.serverTrail)
        this.app
          .showConfirm(
            'Clear Vessel Trail',
            'Do you want to delete the vessel trail?'
          )
          .subscribe((res) => {
            if (res) {
              if (!this.app.data.serverTrail) {
                this.app.data.trail = [];
              } else {
                if (this.app.config.selections.trailFromServer) {
                  this.skres.getVesselTrail(); // request trail from server
                }
              }
            }
          });
    }
  }

  // ** clear course / navigation data **
  public clearCourseData() {
    const idx = this.app.data.navData.pointIndex;
    this.app.data.navData = {
      vmg: null,
      dtg: null,
      ttg: null,
      bearing: { value: null, type: null },
      bearingTrue: null,
      bearingMagnetic: null,
      xte: null,
      eta: null,
      position: [null, null],
      pointIndex: idx,
      pointTotal: 0,
      arrivalCircle: null,
      startPosition: [null, null],
      pointNames: [],
      activeRoutePoints: null,
      destPointName: ''
    };
  }

  // ** clear active destination **
  public clearDestination() {
    this.skres.clearCourse(this.app.data.vessels.activeId);
  }

  // ********** MAP / UI ACTIONS **********

  // ** set active route **
  public activateRoute(id: string) {
    this.skres.activateRoute(id, this.app.data.vessels.activeId);
  }

  // ** Increment / decrement next active route point **
  public routeNextPoint(pointIndex: number) {
    this.skres.coursePointIndex(pointIndex);
    this.focusMap();
  }

  // ** show feature (vessel/AtoN/Aircraft/Route points) properties **
  public featureProperties(e: { id: string; type: string }) {
    let v: FBRoute | SKVessel | SKSaR | SKAircraft | SKAtoN;
    if (e.type === 'route') {
      v = this.skres.fromCache('routes', e.id);
      if (v) {
        this.bottomSheet
          .open(ActiveResourcePropertiesModal, {
            disableClose: true,
            data: {
              title: 'Route Properties',
              resource: v,
              type: e.type,
              skres: this.skres
            }
          })
          .afterDismissed()
          .subscribe((deactivate: boolean) => {
            if (deactivate) {
              this.clearDestination();
            }
            this.focusMap();
          });
      }
    } else if (e.type === 'aton' || e.type === 'meteo') {
      let title: string;
      let icon: string;
      let atonType: string;
      if (e.type === 'meteo') {
        v = this.app.data.meteo.get(e.id);
        title = 'Meteo Properties';
        icon = 'air';
        atonType = e.type;
      } else if (e.id.slice(0, 3) === 'sar') {
        v = this.app.data.sar.get(e.id);
        title = 'SaR Properties';
        icon = 'tour';
        atonType = 'sar';
      } else {
        v = this.app.data.atons.get(e.id);
        title = 'AtoN Properties';
        icon = 'beenhere';
        atonType = 'aton';
      }
      if (v) {
        this.bottomSheet
          .open(AtoNPropertiesModal, {
            disableClose: true,
            data: {
              title: title,
              target: v,
              id: e.id,
              icon: icon,
              type: atonType
            }
          })
          .afterDismissed()
          .subscribe(() => this.focusMap());
      }
    } else if (e.type === 'aircraft') {
      v = this.app.data.aircraft.get(e.id);
      if (v) {
        this.bottomSheet
          .open(AircraftPropertiesModal, {
            disableClose: true,
            data: {
              title: 'Aircraft Properties',
              target: v,
              id: e.id
            }
          })
          .afterDismissed()
          .subscribe(() => this.focusMap());
      }
    } else if (e.type === 'alarm') {
      this.notiMgr.showAlertInfo(e.id);
    } else if (e.type === 'rset') {
      v = this.skres.resSetFromCache(e.id);
      if (v) {
        this.bottomSheet
          .open(ResourceSetFeatureModal, {
            disableClose: true,
            data: { id: e.id, skres: v }
          })
          .afterDismissed()
          .subscribe(() => {
            this.focusMap();
          });
      }
    } else {
      v =
        e.type === 'self'
          ? this.app.data.vessels.self
          : this.app.data.vessels.aisTargets.get(e.id);
      if (v) {
        this.bottomSheet
          .open(AISPropertiesModal, {
            disableClose: true,
            data: {
              title: 'Vessel Properties',
              target: v,
              id: e.id
            }
          })
          .afterDismissed()
          .subscribe(() => this.focusMap());
      }
    }
  }

  // ** handle drag and drop of files onto map container**
  public mapDragOver(e: DragEvent) {
    e.preventDefault();
  }

  public mapDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files) {
      if (e.dataTransfer.files.length > 1) {
        this.app.showAlert(
          'Load Resources',
          'Multiple files provided!\nPlease select only one file for processing.'
        );
      } else {
        const reader = new FileReader();
        reader.onerror = () => {
          this.app.showAlert(
            'File Load error',
            `There was an error reading the file contents!`
          );
        };
        if (!e.dataTransfer.files[0].name) {
          return;
        }
        const fname = e.dataTransfer.files[0].name;
        reader.onload = () => {
          this.processGPX({ name: fname, data: reader.result });
        };
        reader.readAsText(e.dataTransfer.files[0]);
      }
    }
  }

  // ** process / cleanup AIS targets
  private processAIS(toggled?: boolean) {
    if (!this.app.config.aisTargets && !toggled) {
      return;
    }
    if (toggled) {
      // ** re-populate list after hide
      this.app.data.vessels.aisTargets.forEach((v, k) => {
        this.app.data.aisMgr.updateList.push(k);
      });
    }
  }

  // ********* MODE ACTIONS *************

  // ** set the active vessel to the supplied UUID **
  public switchActiveVessel(uuid: string = null) {
    this.app.data.vessels.activeId = uuid;
    if (!uuid) {
      this.app.data.vessels.active = this.app.data.vessels.self;
    } else {
      const av = this.app.data.vessels.aisTargets.get(uuid);
      if (!av) {
        this.app.data.vessels.active = this.app.data.vessels.self;
        this.app.data.vessels.activeId = null;
      } else {
        this.app.data.vessels.active = av;
        // if instrument panel open - close it
        this.sideright.close();
      }
    }
    this.app.data.activeRoute = null;
    this.clearCourseData();
    this.app.debug(`** Active vessel: ${this.app.data.vessels.activeId} `);
    this.app.debug(this.app.data.vessels.active);
  }

  // ** switch between realtime and history playback modes
  public switchMode(toMode: SKSTREAM_MODE, options?: StreamOptions) {
    this.app.debug(`switchMode from: ${this.mode} to ${toMode}`);
    if (toMode === SKSTREAM_MODE.PLAYBACK) {
      // ** history playback
      this.app.db.saveTrail('self', this.app.data.trail);
      this.app.data.trail = [];
    } else {
      // ** realtime data
      this.app.db.getTrail('self').then((t) => {
        this.app.data.trail = t && t.value ? t.value : [];
      });
    }
    this.switchActiveVessel();
    this.openSKStream(options, toMode, true);
  }

  // ** show select mode dialog
  public showSelectMode() {
    if (this.mode === SKSTREAM_MODE.REALTIME) {
      // request history playback
      this.app
        .showConfirm(
          'Do you want to change to History Playback mode?',
          'Switch Mode'
        )
        .subscribe((r) => {
          if (r) {
            this.showPlaybackSettings();
          }
        });
    } else {
      // request realtime
      this.app
        .showConfirm(
          'Do you want to exit History Playback mode?',
          'Exit History Playback'
        )
        .subscribe((r) => {
          if (r) {
            this.switchMode(SKSTREAM_MODE.REALTIME);
          }
        });
    }
  }

  // ******** DRAW / EDIT EVENT HANDLERS ************

  // ** handle modify start event **
  public handleModifyStart(e: { id: string; type: string }) {
    this.draw.type = null;
    this.draw.mode = null;
    this.draw.enabled = false;
    this.draw.modify = true;
    this.draw.modifyMode = e.type;
    this.draw.forSave = { id: e.type ?? null, coords: null };
    this.app.data.map.suppressContextMenu = true;
    if (e.type === 'route') {
      this.app.data.measurement.coords = this.skres.fromCache(
        'routes',
        e.id
      )[1].feature.geometry.coordinates;
    }
  }

  // ** handle modify end event **
  public handleModifyEnd(e: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coords: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coordsMetadata?: any[];
  }) {
    if (
      this.app.data.activeRoute &&
      e.id.indexOf(this.app.data.activeRoute) !== -1
    ) {
      this.app.data.activeRouteIsEditing = true;
    } else {
      this.app.data.activeRouteIsEditing = false;
    }
    this.app.data.editingId = e.id;
    this.draw.forSave = e;
    this.app.debug(this.draw.forSave);
  }

  // ** Draw end event **
  public handleDrawEnd(e: DrawEndEvent) {
    this.draw.enabled = false;
    let params;
    let region: SKRegion;
    let uuid: string;
    switch (this.draw.mode) {
      case 'note':
        params = { position: e.coordinates };
        if (this.draw.properties['group']) {
          params['group'] = this.draw.properties['group'];
        }
        this.skres.showNoteEditor(params);
        break;
      case 'waypoint':
        this.skres.showWaypointEditor({ position: e.coordinates as Position });
        break;
      case 'route':
        this.skres.showRouteNew({ coordinates: e.coordinates as LineString });
        break;
      case 'region':
        region = new SKRegion();
        region.feature.geometry.coordinates = [
          GeoUtils.normaliseCoords(e.coordinates as Polygon)
        ];
        this.skres.createRegion(region);
        break;
    }
    // clean up
    this.draw.mode = null;
    this.draw.modify = false;
    this.app.data.map.suppressContextMenu = false;
  }

  // ** End Draw / modify / Measure mode **
  public cancelDraw() {
    if (this.draw.modify && this.draw.forSave && this.draw.forSave.id) {
      if (this.draw.forSave.id === 'anchor') {
        this.draw.forSave = null;
        this.app.data.activeRouteIsEditing = false;
        this.focusMap();
      } else {
        // save changes
        this.app
          .showConfirm(
            `Do you want to save the changes made to ${
              this.draw.forSave.id.split('.')[0]
            }?`,
            'Save Changes'
          )
          .subscribe((res) => {
            const r = this.draw.forSave.id.split('.');
            if (res) {
              // save changes
              if (r[0] === 'route') {
                this.skres.updateRouteCoords(
                  r[1],
                  this.draw.forSave.coords,
                  this.draw.forSave.coordsMetadata
                );
              }
              if (r[0] === 'waypoint') {
                this.skres.updateWaypointPosition(
                  r[1],
                  this.draw.forSave.coords
                );
                // if waypoint the target destination update nextPoint
                if (r[1] === this.app.data.activeWaypoint) {
                  this.skres.setDestination({
                    latitude: this.draw.forSave.coords[1],
                    longitude: this.draw.forSave.coords[0]
                  });
                }
              }
              if (r[0] === 'note') {
                this.skres.updateNotePosition(r[1], this.draw.forSave.coords);
              }
              if (r[0] === 'region') {
                this.skres.updateRegionCoords(r[1], this.draw.forSave.coords);
              }
            } else {
              if (r[0] === 'route') {
                this.skres.getRoutes();
              }
              if (r[0] === 'waypoint') {
                this.skres.getWaypoints();
              }
              if (r[0] === 'note' || r[0] === 'region') {
                this.skres.getNotes();
              }
            }
            this.draw.forSave = null;
            this.app.data.activeRouteIsEditing = false;
            this.focusMap();
          });
      }
    }
    // clean up
    this.draw.enabled = false;
    this.draw.mode = null;
    this.draw.modify = false;
    this.measure.enabled = false;
    this.app.data.editingId = null;
    this.app.data.map.suppressContextMenu = false;
    this.app.data.measurement = { coords: [], index: -1 };
  }

  // ******** SIGNAL K STREAM *************

  // ** fetch resource types from server **
  fetchResources(allTypes = false) {
    this.skres.getRoutes();
    this.skres.getWaypoints();
    this.skres.getCharts();
    //this.skres.fetchRegions();
    this.skres.getNotes();
    if (allTypes) {
      this.fetchOtherResources(true);
    }
  }

  // ** fetch non-standard resources from server **
  fetchOtherResources(onlySelected = false) {
    this.skres.trackCacheRefresh();
    this.app.config.resources.paths.forEach((i) => {
      this.skresOther.getItems(i, onlySelected);
    });
  }

  // ** open WS Stream
  private openSKStream(
    options: StreamOptions = null,
    toMode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME,
    restart = false
  ) {
    if (restart) {
      this.streamOptions = { options: options, toMode: toMode };
      this.stream.close();
      return;
    }
    this.stream.open(options);
  }

  // ** query server for current values **
  private queryAfterConnect() {
    if (this.signalk.server.info.version.split('.')[0] === '1') {
      this.app.showAlert(
        'Unsupported Server Version:',
        'The connected Signal K server is not supported by this version of Freeboard-SK.\n Signal K server version 2 or later is required!'
      );
    }
    this.app.alignResourcesPaths();
    this.signalk.api.getSelf().subscribe(
      (r) => {
        this.stream.post({
          cmd: 'vessel',
          options: { context: 'self', name: r['name'] }
        });
        this.fetchResources(true); // ** fetch all resource types from server
        if (this.app.config.selections.trailFromServer) {
          this.skres.getVesselTrail(); // request trail from server
        }
        // ** query anchor alarm status
        this.anchor.queryAnchorStatus(
          undefined,
          this.app.data.vessels.self.position
        );
      },
      (err: HttpErrorResponse) => {
        if (err.status && err.status === 401) {
          this.showLogin(null, false, true);
        }
        this.app.debug('No vessel data available!');
      }
    );
    this.app.fetchPluginSettings();
  }

  // ** handle connection established
  private onConnect(e?: NotificationMessage | UpdateMessage) {
    this.app.showMessage('Connection Open.', false, 2000);
    this.app.debug(e);
    // ** query server for status
    this.queryAfterConnect();
    // ** start trail timer
    this.startTimers();
  }

  // ** handle connection closure
  private onClose(e?: NotificationMessage | UpdateMessage) {
    this.app.debug('onClose: STREAM connection closed...');
    this.app.debug(e);
    this.stopTimers();
    if (e.result) {
      // closed by command then restart
      this.openSKStream(this.streamOptions.options, this.streamOptions.toMode);
    } else {
      const data = {
        title: 'Connection Closed:',
        buttonText: 'Re-connect',
        message: ''
      };
      if (e.playback) {
        data.buttonText = 'OK';
        data.message = 'Unable to open Playback connection.';

        this.app
          .showAlert(data.message, data.title, data.buttonText)
          .subscribe(() => {
            if (this.mode === SKSTREAM_MODE.REALTIME) {
              this.switchMode(this.mode);
            } else {
              this.showPlaybackSettings();
            }
          });
      } else {
        if (!this.reconnecting) {
          this.reconnecting = true;
          setTimeout(() => {
            this.reconnecting = false;
            this.openSKStream(this.streamOptions.options, this.mode);
          }, 5000);
        }
      }
    }
  }

  private reconnecting = false;

  // ** handle error message
  private onError(e?: NotificationMessage | UpdateMessage) {
    this.app.showMessage('Connection Error!', false, 2000);
    console.warn('Stream Error!', e);
  }

  // ** handle delta message received
  private onMessage(e: NotificationMessage | UpdateMessage) {
    if (e.action === 'hello') {
      // ** hello message
      this.app.debug(e);
      if (e.playback) {
        this.mode = SKSTREAM_MODE.PLAYBACK;
      } else {
        this.mode = SKSTREAM_MODE.REALTIME;
        this.stream.subscribe();
      }
      this.app.data.selfId = e.self;
      return;
    } else if (e.action === 'update') {
      // delta message
      if (this.mode === SKSTREAM_MODE.PLAYBACK) {
        const d = new Date(e.timestamp);
        this.display.playback.time = `${d.toDateString().slice(4)} ${d
          .toTimeString()
          .slice(0, 8)}`;
      } else {
        this.display.playback.time = null;
        this.setDarkTheme();
        if (
          e.result.self.resourceUpdates &&
          e.result.self.resourceUpdates.length !== 0
        ) {
          this.skres.processDelta(e.result.self.resourceUpdates);
        }
      }
      this.updateNavPanel();
    }
  }

  // ** Update NavData Panel display **
  private updateNavPanel() {
    this.display.navDataPanel.show =
      this.app.data.activeRoute ||
      this.app.data.activeWaypoint ||
      this.app.data.navData.position
        ? true
        : false;

    this.display.navDataPanel.nextPointCtrl = this.app.data.activeRoute
      ? true
      : false;

    //autopilot
    if (this.app.data.vessels.self.autopilot.enabled) {
      this.display.navDataPanel.apModeColor = 'primary';
    } else {
      this.display.navDataPanel.apModeColor = '';
    }

    this.display.navDataPanel.apModeText = this.app.data.vessels.self.autopilot
      .default
      ? 'Autopilot: ' + this.app.data.vessels.self.autopilot.default
      : '';
  }
}
