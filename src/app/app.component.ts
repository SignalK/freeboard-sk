import {
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Observable, Subject } from 'rxjs';

// standalone
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  ETADialComponent,
  FileInputComponent,
  InteractionHelpComponent,
  MFBContainerComponent,
  PiPVideoComponent,
  TextDialComponent,
  TTGDialComponent
} from './lib/components';

// ****

import { AppFacade } from './app.facade';
import { SignalKClient } from 'signalk-client-angular';
import { WakeLockService } from 'src/app/lib/services';

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
  AnchorService,
  SKResourceService,
  SKVessel,
  SKSaR,
  SKAircraft,
  SKAtoN,
  FBCustomResourceService,
  SKRegion,
  WeatherForecastModal,
  CourseSettingsModal,
  NotificationManager,
  GPXImportDialog,
  GPXExportDialog,
  CourseService,
  SettingsFacade,
  AutopilotService,
  FBMapComponent,
  ExperimentsComponent,
  AnchorWatchComponent,
  AlertComponent,
  AlertListComponent,
  AutopilotComponent,
  RouteNextPointComponent,
  RouteListComponent,
  WaypointListComponent,
  ChartListComponent,
  NoteListComponent,
  RegionListComponent,
  TrackListComponent,
  AISListComponent,
  GroupListComponent,
  InfoLayerListComponent,
  BuildRouteComponent
} from 'src/app/modules';

import {
  AboutDialog,
  LoginDialog,
  PlaybackDialog,
  GeoJSONImportDialog,
  Trail2RouteDialog
} from 'src/app/lib/components/dialogs';
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
import {
  DrawFeatureType,
  FBMapInteractService,
  DrawFeatureInfo,
  SelectionResultDef
} from './modules/map/fbmap-interact.service';
import { RadarAPIService } from './modules/radar/radar-api.service';

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
  imports: [
    MatMenuModule,
    MatSidenavModule,
    MatBadgeModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    CommonModule,
    TextDialComponent,
    TTGDialComponent,
    ETADialComponent,
    FileInputComponent,
    PiPVideoComponent,
    MFBContainerComponent,
    InteractionHelpComponent,
    FBMapComponent,
    ExperimentsComponent,
    AnchorWatchComponent,
    AlertComponent,
    AlertListComponent,
    AutopilotComponent,
    RouteNextPointComponent,
    RouteListComponent,
    WaypointListComponent,
    ChartListComponent,
    NoteListComponent,
    RegionListComponent,
    TrackListComponent,
    AISListComponent,
    GroupListComponent,
    InfoLayerListComponent,
    BuildRouteComponent
  ]
})
export class AppComponent {
  @ViewChild('sideright', { static: false }) sideright;

  protected navDataPanel = signal<{
    show: boolean;
    nextPointCtrl: boolean;
    apModeColor: string;
    apModeText: string;
  }>({
    show: false,
    nextPointCtrl: false,
    apModeColor: '',
    apModeText: ''
  });

  protected playbackTime = signal<string | null>(null);

  protected instrumentPanel = signal<{
    open: boolean;
    activate: boolean;
  }>({
    open: false,
    activate: false
  });

  protected leftMenuCtrl = signal<{
    leftMenuPanel: boolean;
    routeList: boolean;
    waypointList: boolean;
    chartList: boolean;
    noteList: boolean;
    regionList: boolean;
    trackList: boolean;
    aisList: boolean;
    resourceGroups: boolean;
    infoLayerList: boolean;
    anchorWatch: boolean;
  }>({
    leftMenuPanel: false,
    routeList: false,
    waypointList: false,
    chartList: false,
    noteList: false,
    regionList: false,
    trackList: false,
    aisList: false,
    resourceGroups: false,
    infoLayerList: false,
    anchorWatch: false
  });

  protected displayFullscreen = signal<{
    active: boolean;
    enabled: boolean;
  }>({
    active: false,
    enabled: document.fullscreenEnabled
  });

  // APP features / mode
  public features = { playbackAPI: true };
  public mode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME; // current mode

  private timers = [];

  // external resources
  protected instUrl = signal<SafeResourceUrl | null>(null);
  private selFavourite = -1;
  protected vidUrl = signal<SafeResourceUrl | null>(null);

  public convert = Convert;
  private obsList = []; // observables array
  private streamOptions = { options: null, toMode: null };

  protected mapSetFocus = signal<string>('');
  protected mapCenter = signal<Position>([0, 0]);
  protected audioStatus = signal<string>('');
  protected isInteracting = computed(() => {
    return (
      this.mapInteract.isMeasuring() ||
      this.mapInteract.isDrawing() ||
      this.mapInteract.isModifying() ||
      this.mapInteract.isBoxSelecting()
    );
  });

  protected app = inject(AppFacade);
  protected mapInteract = inject(FBMapInteractService);
  protected anchor = inject(AnchorService);
  protected notiMgr = inject(NotificationManager);
  protected course = inject(CourseService);
  protected stream = inject(SKStreamFacade);
  protected skres = inject(SKResourceService);
  protected skresOther = inject(FBCustomResourceService);
  protected signalk = inject(SignalKClient);
  private dom = inject(DomSanitizer);
  private overlayContainer = inject(OverlayContainer);
  private bottomSheet = inject(MatBottomSheet);
  private dialog = inject(MatDialog);
  protected wakeLock = inject(WakeLockService);
  private settings = inject(SettingsFacade);
  protected autopilot = inject(AutopilotService);
  protected radarApi = inject(RadarAPIService);

  constructor() {
    // set self to active vessel
    this.app.data.vessels.active = this.app.data.vessels.self;

    // CONFIG$ - handle app.config$ event
    this.obsList.push(
      this.app.config$.subscribe((value: string) => {
        // config has been loaded and cleaned (ready)
        if (value === 'ready') {
          this.fetchResources(true);
        }
      })
    );

    // handle skAuthChange signal
    effect(() => {
      this.app.debug('** skAuthChange Event:', this.app.skAuthChange());
      this.handleSKAuthChange();
    });
    // handle kioskMode signal
    effect(() => {
      this.app.debug('** kioskMode Event:', this.app.kioskMode());
      this.toggleSuppressContextMenu(this.app.kioskMode());
    });
    // handle map interaction selection signal
    effect(() => {
      this.handleSelectionEnded(this.mapInteract.selection());
    });
    // handle uiConfig signal
    effect(() => {
      this.app.uiConfig();
      this.handleSettingChangeEvent(undefined);
    });
  }

  // ********* LIFECYCLE ****************

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.app.config.display.disableWakelock) {
        this.wakeLock.enable();
      }
    }, 500);
  }

  protected enableAudio() {
    if (this.app.audio.context) {
      this.app.audio.context.resume();
    }
  }

  ngOnInit() {
    // ** audio context handing **
    this.audioStatus.update(() => this.app.audio.context.state);
    this.app.debug('audio state:', this.audioStatus());
    this.app.audio.context.onstatechange = () => {
      this.app.debug('audio statechange:', this.app.audio.context.state);
      this.audioStatus.update(() => this.app.audio.context.state);
    };

    // ** apply loaded app config
    this.mapCenter.update(() => this.app.config.map.center);
    this.instrumentPanel.update((current) => {
      return Object.assign({}, current, {
        activate: !this.app.config.display.plugins.startOnOpen
      });
    });

    // overlay dark-theme
    this.setDarkTheme();

    this.instUrl.update(() =>
      this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl())
    );
    this.vidUrl.update(() =>
      this.dom.bypassSecurityTrustResourceUrl(
        `${this.app.config.resources.video.url}`
      )
    );

    // ** connect to signalk server and intialise
    this.connectSignalKServer();

    // ********************* SUBSCRIPTIONS *****************
    // ** SIGNAL K STREAM **
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
    // ** TRAIL$ update event
    this.obsList.push(
      this.stream.trail$().subscribe((msg) => this.handleTrailUpdate(msg))
    );

    // ** SETTINGS.CHANGE$ - handle settings.change$ event
    this.obsList.push(
      this.settings.change$.subscribe((value: string[]) =>
        this.handleSettingChangeEvent(value)
      )
    );

    // fullscreen event handlers
    document.addEventListener('fullscreenchange', () => {
      this.displayFullscreen.update((current) =>
        Object.assign({}, current, {
          active: document.fullscreenElement ? true : false
        })
      );
    });
    document.addEventListener('fullscreenerror', (e) => {
      this.displayFullscreen.update((current) =>
        Object.assign({}, current, { active: false })
      );
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
  protected getOrientation() {
    return this.app.uiConfig().mapNorthUp
      ? 'rotate(' + 0 + 'deg)'
      : 'rotate(' + (0 - this.app.data.vessels.active.orientation) + 'rad)';
  }

  /** TOOLBAR ACTIONS */

  protected toggleRadar() {
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { radarLayer: !current.radarLayer });
    });
    this.focusMap();
  }

  protected toggleMoveMap(exit = false) {
    this.app.uiConfig.update((current) => {
      const mm = exit ? false : !current.mapMove;
      return Object.assign({}, current, { mapMove: mm });
    });
    this.focusMap();
  }

  protected toggleNorthUp() {
    this.app.uiConfig.update((current) => {
      return Object.assign({}, current, { mapNorthUp: !current.mapNorthUp });
    });
    this.focusMap();
  }

  protected toggleToolbarButtons() {
    this.app.uiConfig.update((current) => {
      return Object.assign({}, current, {
        toolbarButtons: !current.toolbarButtons
      });
    });
    this.focusMap();
  }

  protected toggleConstrainMapZoom() {
    this.app.uiConfig.update((current) => {
      return Object.assign({}, current, {
        mapConstrainZoom: !current.mapConstrainZoom
      });
    });
    this.skres.setMapZoomRange();
    this.focusMap();
  }

  protected invertFeatureLabelColor() {
    this.app.uiConfig.update((current) => {
      return Object.assign({}, current, { invertColor: !current.invertColor });
    });
    this.focusMap();
  }

  protected toggleAlertList(show: boolean) {
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { alertList: show });
    });
  }

  protected toggleAutopilotConsole(show: boolean) {
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { autopilotConsole: show });
    });
  }

  protected toggleRouteBuilderConsole(show: boolean) {
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { routeBuilder: show });
    });
  }

  protected toggleSuppressContextMenu(value: boolean) {
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: value });
    });
  }

  /** fullscreen mode */
  protected toggleFullscreen() {
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

  /** ************* */

  private setDarkTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (
      (this.app.config.display.darkMode.source === 0 && mq.matches) ||
      (this.app.config.display.darkMode.source === 1 &&
        this.app.data.vessels.self.environment.mode === 'night') ||
      this.app.config.display.darkMode.source === -1
    ) {
      this.overlayContainer.getContainerElement().classList.add('dark-theme');
      this.app.config.display.darkMode.enabled = true;
    } else {
      this.overlayContainer
        .getContainerElement()
        .classList.remove('dark-theme');
      this.app.config.display.darkMode.enabled = false;
    }
  }

  private formatInstrumentsUrl() {
    const url = `${this.app.hostDef.url}${this.app.config.display.plugins.instruments}`;
    const params = this.app.config.display.plugins.parameters
      ? this.app.config.display.plugins.parameters.length > 0 &&
        this.app.config.display.plugins.parameters[0] !== '?'
        ? `?${this.app.config.display.plugins.parameters}`
        : this.app.config.display.plugins.parameters
      : '';
    return params ? `${url}/${params}` : url;
  }

  // ** select prev/next favourite plugin **
  protected selectPlugin(next = false) {
    if (next) {
      if (this.selFavourite === -1) {
        this.selFavourite = 0;
      } else if (
        this.selFavourite ===
        this.app.config.display.plugins.favourites.length - 1
      ) {
        this.selFavourite = -1;
      } else {
        this.selFavourite++;
      }
    } else {
      if (this.selFavourite === -1) {
        this.selFavourite =
          this.app.config.display.plugins.favourites.length - 1;
      } else if (this.selFavourite === 0) {
        this.selFavourite = -1;
      } else {
        this.selFavourite--;
      }
    }
    const url =
      this.selFavourite === -1
        ? this.formatInstrumentsUrl()
        : `${this.app.hostDef.url}${
            this.app.config.display.plugins.favourites[this.selFavourite]
          }`;

    this.instUrl.update(() => this.dom.bypassSecurityTrustResourceUrl(url));
  }

  /** handle infolayer parameter change **/
  protected onInfoLayerParamChange(param: {
    id: string;
    param: { [key: string]: any };
  }) {
    this.skresOther.infoLayerParams.update(() => [param]);
  }

  // ** handle map context menu selections **
  protected handleContextMenuSelection(action: string) {
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
  protected trailToRoute() {
    this.dialog
      .open(Trail2RouteDialog, {
        disableClose: true,
        data: { trail: this.app.selfTrail() }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          this.skres.newRouteAt(r.data);
        }
        this.focusMap();
      });
  }

  protected showWeather(mode: string) {
    if (mode === 'forecast') {
      this.bottomSheet
        .open(WeatherForecastModal, {
          disableClose: true,
          data: {
            title: 'Forecast',
            position: this.app.data.vessels.self.position,
            subTitle: 'Location: Vessel Position'
          }
        })
        .afterDismissed()
        .subscribe(() => {
          this.focusMap();
        });
    }
  }

  // display selected experiment UI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected openExperiment(e: { choice: string; value?: any }) {
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
              data: { path: e.choice }
            })
            .afterDismissed()
            .subscribe(() => {
              this.focusMap();
            });
        }
    }
  }

  // ** display course settings screen **
  protected openCourseSettings() {
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
  /** Handle SignalK Auth token value change */
  protected handleSKAuthChange() {
    this.signalk.getLoginStatus().subscribe((r) => {
      this.app.data.loginRequired = r.authenticationRequired ?? false;
      this.app.isLoggedIn.update(() =>
        r.status === 'loggedIn' ? true : false
      );
      // ** Request using cached auth token and display badge
      this.signalk.get('/plugins/freeboard-sk').subscribe(
        () => {
          this.app.debug('User Authenticated');
          this.app.isLoggedIn.set(true);
        },
        (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.app.debug('User NOT Authenticated');
            this.app.isLoggedIn.set(false);
          }
        }
      );
    });
  }

  /** establish connection to server */
  private connectSignalKServer() {
    this.app.data.selfId = null;
    this.app.data.server = null;
    this.signalk.proxied = this.app.config.signalk.proxied;
    this.signalk
      .connect(
        this.app.hostDef.name,
        this.app.hostDef.port,
        this.app.hostDef.ssl
      )
      .subscribe(
        () => {
          this.signalk.authToken = this.app.getFBToken();
          this.app.watchSKLogin();
          this.app.loadSettingsfromServer().then((result: boolean) => {
            if (!result && this.app.launchStatus.result === 'first_run') {
              const wr = this.app.showWelcome();
              if (wr) {
                wr.afterClosed().subscribe((r) => {
                  if (r) this.openSettings();
                });
              }
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
  private async getFeatures() {
    // check server features
    const ff = {
      anchorApi: false,
      autopilotApi: false,
      weatherApi: false,
      radarApi: false,
      notificationApi: false,
      buddyList: false
    };
    this.signalk.get('/signalk/v2/features?enabled=1').subscribe(
      (res: {
        apis: string[];
        plugins: Array<{ id: string; version: string }>;
      }) => {
        // detect apis
        ff.weatherApi = res.apis.includes('weather');
        ff.autopilotApi = res.apis.includes('autopilot');
        ff.radarApi = res.apis.includes('radar');
        ff.notificationApi = res.apis.includes('notifications');

        // detect plugins
        const hasPlugin = {
          charts: false,
          pmTiles: false
        };

        res.plugins.forEach((p: { id: string; version: string }) => {
          // anchor alarm
          if (p.id === 'anchoralarm') {
            this.app.debug('*** found anchoralarm plugin');
            ff.anchorApi = true;
          }
          // buddy list
          if (p.id === 'signalk-buddylist-plugin') {
            this.app.debug('*** found buddylist plugin');
            ff.buddyList = semver.satisfies(p.version, '>1.2.0') ? true : false;
          }
          // PMTiles support
          if (p.id === 'signalk-pmtiles-plugin') {
            this.app.debug('*** found PMTiles plugin');
            hasPlugin.pmTiles = true;
          }
        });
        this.app.featureFlags.update((current) => {
          return Object.assign({}, current, ff);
        });
      },
      () => {
        this.app.debug('*** Features API not present!');
      }
    );

    // Check for custom resource collections
    const rcs = await this.skresOther.initCustomCollections();
    this.app.featureFlags.update((current) => {
      return Object.assign({}, current, rcs);
    });
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

  /** process local vessel trail
   * @param trailData Vessel trail data from server (stream.trail$)
   */
  private processTrail(trailData?: LineString) {
    if (!this.app.config.vessels.trail) {
      return;
    }
    // ** update vessel trail **
    const t = this.app.selfTrail().slice(-1);
    if (this.app.data.vessels.showSelf) {
      if (t.length === 0) {
        this.app.selfTrail.update((current) => {
          const st = [].concat(current);
          st.push(this.app.data.vessels.self.position);
          return st;
        });
        return;
      }
      if (
        this.app.data.vessels.self.position[0] !== t[0][0] ||
        this.app.data.vessels.self.position[1] !== t[0][1]
      ) {
        this.app.selfTrail.update((current) => {
          const st = [].concat(current);
          st.push(this.app.data.vessels.self.position);
          return st;
        });
      }
    }

    if (!trailData || trailData.length === 0) {
      // no server trail data supplied
      if (this.app.selfTrail().length % 60 === 0 && this.app.data.serverTrail) {
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer(); // request trail from server
        }
      }
      this.app.selfTrail.update((current) => current.slice(-5000));
    } else {
      // use server trail data, keep minimal local trail data
      const lastseg = trailData.slice(-1);
      const lastpt: any =
        lastseg.length !== 0
          ? lastseg[0].slice(-1)
          : trailData.length > 1
            ? trailData[trailData.length - 2].slice(-1)
            : [];
      this.app.selfTrail.update(() => lastpt);
    }
    const trailId = this.mode === SKSTREAM_MODE.PLAYBACK ? 'history' : 'self';
    this.app.db.saveTrail(trailId, this.app.selfTrail());
  }

  // ** stream.trail$ event handler (vessel trail from server) **
  private handleTrailUpdate(e: { action: string; mode: string; data: any[] }) {
    if (e.action === 'get' && e.mode === 'trail') {
      if (this.app.config.vessels.trailFromServer) {
        this.app.selfTrailFromServer.update(() => {
          return e.data;
        });
      }
      this.processTrail(e.data);
    }
  }

  /** Handle setting change events
   * @param e setting change identifier
   */
  private handleSettingChangeEvent(e: string[]) {
    if (e?.includes('darkTheme')) {
      this.setDarkTheme();
    }

    if (e?.includes('headingAttribute')) {
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
      this.app.sTrueMagChoice.set(this.app.config.units.headingAttribute);
    }

    if (
      e?.includes('pluginParameters') ||
      e?.includes('pluginInstruments') ||
      e?.includes('pluginStartOnOpen')
    ) {
      this.instUrl.update(() =>
        this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl())
      );
      // update instrument app state
      this.instrumentPanel.update((current) => {
        return Object.assign({}, current, {
          activate: this.app.config.display.plugins.startOnOpen
            ? current.open
              ? true
              : false
            : true
        });
      });
    }

    if (e?.includes('videoUrl')) {
      this.vidUrl.update(() =>
        this.dom.bypassSecurityTrustResourceUrl(
          `${this.app.config.resources.video.url}`
        )
      );
    }

    // ** trail **
    if (e?.includes('vesselTrail') || e?.includes('trailFromServer')) {
      if (this.app.config.vessels.trail) {
        // show trail
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer();
        } else {
          this.app.data.serverTrail = false;
        }
      }
    }
  }

  // ** trigger focus of the map so keyboard controls work
  protected focusMap() {
    this.mapSetFocus.update(() => Date().valueOf());
  }

  // ********* SIDENAV ACTIONS *************

  protected rightSideNavAction(e: boolean) {
    this.instrumentPanel.update((current) => {
      return Object.assign({}, current, {
        open: e,
        activate: this.app.config.display.plugins.startOnOpen
          ? e
          : current.activate
      });
    });
    if (!e) {
      this.focusMap();
    } // set when closed
  }

  /** control left menu display  */
  protected displayLeftMenu(menulist = '', show = false) {
    const lm = {
      leftMenuPanel: show,
      routeList: false,
      waypointList: false,
      chartList: false,
      noteList: false,
      regionList: false,
      trackList: false,
      aisList: false,
      resourceGroups: false,
      infoLayerList: false,
      anchorWatch: false
    };
    switch (menulist) {
      case 'routeList':
        lm.routeList = show;
        break;
      case 'waypointList':
        lm.waypointList = show;
        break;
      case 'chartList':
        lm.chartList = show;
        break;
      case 'noteList':
        lm.noteList = show;
        break;
      case 'regionList':
        lm.regionList = show;
        break;
      case 'trackList':
        lm.trackList = show;
        break;
      case 'anchorWatch':
        lm.anchorWatch = show;
        break;
      case 'aisList':
        lm.aisList = show;
        break;
      case 'resourceGroups':
        lm.resourceGroups = show;
        break;
      case 'infoLayerList':
        lm.infoLayerList = show;
        break;
      default:
        lm.leftMenuPanel = false;
    }
    this.leftMenuCtrl.update(() => lm);
    if (!show) {
      this.focusMap();
    }
  }

  // ********* MAIN MENU ACTIONS *************

  // ** open about dialog **
  protected openAbout() {
    this.dialog
      .open(AboutDialog, {
        disableClose: false,
        data: {
          name: this.app.name,
          version: this.app.version,
          description: this.app.description,
          logo: this.app.logo,
          url: this.app.url
        }
      })
      .afterClosed()
      .subscribe(() => this.focusMap());
  }

  // ** open settings dialog **
  protected openSettings() {
    this.dialog
      .open(SettingsDialog, {
        disableClose: true,
        data: {},
        maxWidth: '90vw',
        minHeight: '80vh'
      })
      .afterClosed()
      .subscribe(() => {
        this.focusMap();
      });
  }

  /** GPX / GeoJSON imports */
  protected importFile(f: { data: string | ArrayBuffer; name: string }) {
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
  protected processGPX(f: { data: string | ArrayBuffer; name: string }) {
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
  protected exportToGPX() {
    this.dialog
      .open(GPXExportDialog, {
        disableClose: true,
        data: {
          routes: this.skres.routes(),
          tracks: [this.app.selfTrail()]
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
  protected processGeoJSON(f: { data: string | ArrayBuffer; name: string }) {
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
  protected importResourceSet() {
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
          this.skres.postToServer(res.path as any, d);
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
  protected showLogin(
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
              this.app.loadSettingsfromServer();
              if (onConnect) {
                this.queryAfterConnect();
              }
              this.app.isLoggedIn.set(true);
              lis.next(true);
            },
            () => {
              // ** auth failed
              this.app.persistToken(null);
              this.signalk.isLoggedIn().subscribe((r) => {
                this.app.isLoggedIn.set(r);
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
          this.app.hasAuthToken.set(false); // show login menu item
          this.signalk.isLoggedIn().subscribe((r: boolean) => {
            this.app.isLoggedIn.set(r);
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

  protected showPlaybackSettings() {
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

  // ***** OPTIONS MENU ACTONS *******

  /**
   * Center and zoom the map
   * @param position Location to center the map
   * @param zoomTo Zoom level to apply
   */
  protected centerAndZoom(position: Position, zoomTo?: number) {
    this.mapCenter.update(() => position);
    if (typeof zoomTo === 'number') {
      this.app.config.map.zoomLevel = zoomTo;
    }
  }

  /**
   * Center the map relative to the vessel position
   */
  protected centerVessel() {
    const pos = this.app.calcMapCenter(this.app.data.vessels.active.position);
    this.centerAndZoom(pos);
  }

  protected toggleAisTargets() {
    this.app.config.ui.showAisTargets = !this.app.config.ui.showAisTargets;
    if (this.app.config.ui.showAisTargets) {
      this.stream.aisTargetUpdated();
    }
    this.app.saveConfig();
  }

  protected toggleCourseData() {
    this.app.config.ui.showCourseData = !this.app.config.ui.showCourseData;
    this.app.saveConfig();
  }

  protected toggleNotes() {
    this.app.config.ui.showNotes = !this.app.config.ui.showNotes;
    this.app.saveConfig();
  }

  // ** delete vessel trail **
  protected clearTrail(noprompt = false) {
    const doClear = () => {
      if (!this.app.data.serverTrail) {
        this.app.selfTrail.set([]);
      } else {
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer(); // request trail from server
        }
      }
    };
    if (noprompt) {
      doClear();
    } else {
      if (!this.app.data.serverTrail) {
        this.app
          .showConfirm(
            'Clear Vessel Trail',
            'Do you want to delete the vessel trail?'
          )
          .subscribe((res) => {
            if (res) {
              doClear();
            }
          });
      }
    }
  }

  // ** clear course / navigation data **
  protected clearCourseData() {
    this.course.initCourseData();
  }

  // ** clear active destination **
  protected clearDestination() {
    this.course.clearCourse();
  }

  // ********** MAP / UI ACTIONS **********

  // ** set active route starting at nearest point **
  protected activateRoute(id: string) {
    const r = this.skres.fromCache('routes', id);
    const cpi = GeoUtils.closestForwardPoint(
      r[1].feature.geometry.coordinates,
      this.app.data.vessels.self.position,
      Convert.radiansToDegrees(this.app.data.vessels.self.heading)
    );
    if (cpi === -1) {
      this.app
        .showConfirm(
          'Closest point is behind vessel!\nDo you want to start from the first point?',
          'Start Route'
        )
        .subscribe((r) => {
          if (r) {
            this.course.activateRoute(id);
          }
        });
      return;
    }
    this.course.activateRoute(id, cpi);
  }

  // ** Increment / decrement next active route point **
  protected routeNextPoint(pointIndex: number) {
    this.course.coursePointIndex(pointIndex);
    this.focusMap();
  }

  // ** show feature (vessel/AtoN/Aircraft/Route points) properties **
  protected async featureProperties(e: { id: string; type: string }) {
    let v: FBRoute | SKVessel | SKSaR | SKAircraft | SKAtoN;
    if (e.type === 'route') {
      try {
        this.app.sIsFetching.set(true);
        v = await this.skres.fromServer('routes', e.id);
        this.app.sIsFetching.set(false);
        if (v) {
          this.bottomSheet
            .open(ActiveResourcePropertiesModal, {
              disableClose: true,
              data: {
                title: 'Route Properties',
                resource: [e.id, v, false],
                type: e.type
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
      } catch (err) {
        this.app.sIsFetching.set(false);
        this.app.parseHttpErrorResponse(err);
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
      v = this.skresOther.fromResourceSetCache(e.id);
      if (v) {
        this.bottomSheet
          .open(ResourceSetFeatureModal, {
            disableClose: true,
            data: { id: e.id, item: v }
          })
          .afterDismissed()
          .subscribe(() => {
            this.focusMap();
          });
      }
    } else {
      // vessel
      const id =
        e.type === 'self'
          ? e.type
          : e.id.includes('vessels.')
            ? e.id.split('.')[1]
            : e.id;
      try {
        this.app.sIsFetching.set(true);
        v = await this.skres.vesselFromServer(id);
        this.app.sIsFetching.set(false);
        if (v) {
          this.bottomSheet
            .open(AISPropertiesModal, {
              disableClose: true,
              data: {
                title: 'Vessel Properties',
                target: v
              }
            })
            .afterDismissed()
            .subscribe(() => this.focusMap());
        }
      } catch (err) {
        this.app.sIsFetching.set(false);
        this.app.parseHttpErrorResponse(err);
      }
    }
  }

  // ** handle drag and drop of files onto map container**
  protected mapDragOver(e: DragEvent) {
    e.preventDefault();
  }

  protected mapDrop(e: DragEvent) {
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

  // ********* MODE ACTIONS *************

  // ** set the active vessel to the supplied UUID **
  protected switchActiveVessel(uuid: string = null) {
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
  protected switchMode(toMode: SKSTREAM_MODE, options?: StreamOptions) {
    this.app.debug(`switchMode from: ${this.mode} to ${toMode}`);
    if (toMode === SKSTREAM_MODE.PLAYBACK) {
      // ** history playback
      this.app.db.saveTrail('self', this.app.selfTrail());
      this.app.selfTrail.set([]);
    } else {
      // ** realtime data
      this.app.db.getTrail('self').then((t) => {
        this.app.selfTrail.update(() => (t && t.value ? t.value : []));
      });
    }
    this.switchActiveVessel();
    this.openSKStream(options, toMode, true);
  }

  // ** show select mode dialog
  protected showSelectMode() {
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

  /** Handle OL selection end event and prompt */
  protected handleSelectionEnded(selection: SelectionResultDef) {
    if (selection.mode === 'seedChart') {
      this.skres.seedChartCache(selection.data, selection.bbox);
    }
  }

  /**
   * Start feature drawing mode
   * @param f type of feature to draw
   */
  protected drawFeature(f: DrawFeatureType) {
    this.mapInteract.startDrawing(f);
  }

  /** Handle feature DrawEnded event and prompt to save */
  protected handleDrawEnded(e: DrawFeatureInfo) {
    this.mapInteract.isDrawing();
    switch (this.mapInteract.draw.resourceType) {
      case 'note':
        const params = { position: e.coordinates };
        if (this.mapInteract.draw.properties['group']) {
          params['group'] = this.mapInteract.draw.properties['group'];
        }
        this.skres.showNoteEditor(params);
        break;
      case 'waypoint':
        this.skres.newWaypointAt(e.coordinates as Position);
        break;
      case 'route':
        this.skres.newRouteAt(e.coordinates as LineString);
        break;
      case 'region':
        const region = new SKRegion();
        region.feature.geometry.coordinates = [
          GeoUtils.normaliseCoords(e.coordinates as Polygon)
        ];
        this.skres.newRegion(region);
        break;
    }
  }

  /** End interaction mode */
  protected closeInteraction() {
    if (this.mapInteract.isBoxSelecting()) {
      this.mapInteract.stopBoxSelection();
    }
    if (this.mapInteract.isMeasuring()) {
      this.mapInteract.stopMeasuring();
    }
    if (this.mapInteract.isDrawing()) {
      this.mapInteract.stopDrawing();
    }
    if (this.mapInteract.isModifying()) {
      this.mapInteract.stopModifying();
      this.app.data.activeRouteIsEditing = false;

      if (this.mapInteract.draw.forSave?.id) {
        // anchor moved
        if (this.mapInteract.draw.forSave.id === 'anchor') {
          this.mapInteract.draw.forSave = null;
          this.focusMap();
          return;
        }

        // save changes
        this.app
          .showConfirm(
            `Do you want to save the changes made to ${
              this.mapInteract.draw.forSave.id.split('.')[0]
            }?`,
            'Save Changes'
          )
          .subscribe((result) => {
            const r = this.mapInteract.draw.forSave.id.split('.');
            if (result) {
              // save changes
              if (r[0] === 'route') {
                this.skres.updateRouteCoords(
                  r[1],
                  this.mapInteract.draw.forSave.coords,
                  this.mapInteract.draw.forSave.coordsMetadata
                );
              }
              if (r[0] === 'waypoint') {
                this.skres.updateWaypointPosition(
                  r[1],
                  this.mapInteract.draw.forSave.coords
                );
                // if waypoint the target destination update nextPoint
                if (r[1] === this.app.data.activeWaypoint) {
                  this.course.setDestination({
                    latitude: this.mapInteract.draw.forSave.coords[1],
                    longitude: this.mapInteract.draw.forSave.coords[0]
                  });
                }
              }
              if (r[0] === 'note') {
                this.skres.updateNotePosition(
                  r[1],
                  this.mapInteract.draw.forSave.coords
                );
              }
              if (r[0] === 'region') {
                this.skres.updateRegionCoords(
                  r[1],
                  this.mapInteract.draw.forSave.coords
                );
              }
            } else {
              // do not save
              if (r[0] === 'route') {
                this.skres.refreshRoutes();
              }
              if (r[0] === 'waypoint') {
                this.skres.refreshWaypoints();
              }
              if (r[0] === 'note') {
                this.skres.refreshNotes();
              }
              if (r[0] === 'region') {
                this.skres.refreshRegions();
              }
            }
            this.mapInteract.draw.forSave = null;
            this.focusMap();
          });
      }
    }
  }

  // ******** SIGNAL K STREAM *************

  /** fetch resource types from server */
  private fetchResources(allTypes = false) {
    this.skres.refreshRoutes();
    this.skres.refreshWaypoints();
    this.skres.refreshCharts();
    this.skres.refreshNotes();
    this.skres.refreshRegions();
    if (allTypes) {
      this.fetchOtherResources();
    }
  }

  /** fetch non-standard resources from server */
  private fetchOtherResources() {
    this.skres.refreshTracks();
    this.skresOther.refreshResourceSetsInBounds();
    this.skresOther.refreshInfoLayers();
  }

  /** open WS Stream */
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
    this.stream.sendConfig(this.app.config);
    this.stream.open(options);
  }

  /** query server for current values */
  private queryAfterConnect() {
    if (this.signalk.server.info.version.split('.')[0] === '1') {
      this.app.showAlert(
        'Unsupported Server Version:',
        'The connected Signal K server is not supported by this version of Freeboard-SK.\n Signal K server version 2 or later is required!'
      );
    }
    this.app.alignCustomResourcesPaths();
    this.signalk.api.getSelf().subscribe(
      (r) => {
        this.stream.post({
          cmd: 'vessel',
          options: { context: 'self', name: r['name'] }
        });
        this.fetchResources(true); // fetch all resource types from server
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer(); // request trail from server
        }
        // query anchor alarm status
        this.anchor.queryAnchorStatus(
          undefined,
          this.app.data.vessels.self.position
        );
        // query radar API
        this.radarApi.listRadars().catch((err: Error) => {
          this.app.debug(err.message);
        });
      },
      (err: HttpErrorResponse) => {
        if (err.status && err.status === 401) {
          this.showLogin(null, false, true);
        }
        this.app.debug('No vessel data available!');
      }
    );
  }

  /** handle connection established */
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
        this.playbackTime.update(
          () => `${d.toDateString().slice(4)} ${d.toTimeString().slice(0, 8)}`
        );
      } else {
        this.playbackTime.set(null);
        this.setDarkTheme();
      }
      this.updateNavPanel();
    }
  }

  // ** Update NavData Panel display **
  private updateNavPanel() {
    this.navDataPanel.update((current) => {
      return {
        show:
          this.app.data.activeRoute ||
          this.app.data.activeWaypoint ||
          this.course.courseData().position
            ? true
            : false,

        nextPointCtrl: this.app.data.activeRoute ? true : false,

        //autopilot
        apModeColor: this.app.data.vessels.self.autopilot.enabled
          ? 'primary'
          : '',

        apModeText: this.app.data.vessels.self.autopilot.default
          ? `Autopilot: ${this.app.data.vessels.self.autopilot.default}`
          : ''
      };
    });
  }
}
