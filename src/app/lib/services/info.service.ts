//*************************************
//** Application Information Service **
//*************************************
import { Injectable, isDevMode } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { State } from './state.service';
import { IAppConfig, FBAppData, AppUpdateMessage } from '../../types';

export interface SettingsSaveOptions {
  fetchNotes?: boolean;
  suppressTrailFetch?: boolean;
}

export interface SettingsMessage {
  action: 'save' | 'load';
  setting: 'data' | 'config';
  options?: SettingsSaveOptions;
}

@Injectable()
export class Info {
  public id = '';
  public name = '';
  public shortName = '';
  public description = ``;
  public version = '';
  public url = '';
  public logo = './assets/img/app_logo.png';

  protected devMode: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public config!: IAppConfig; //** holds app configuration settings **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data: FBAppData; //** holds app data **
  public state: State;

  // Observables
  private upgradedSource: Subject<AppUpdateMessage>;
  public upgraded$: Observable<AppUpdateMessage>;
  private settings: Subject<SettingsMessage>;
  public settings$: Observable<SettingsMessage>;

  constructor() {
    this.state = new State();
    this.devMode = isDevMode();
    this.state.appId = this.id;
    // ** initialise events
    this.upgradedSource = new Subject<AppUpdateMessage>();
    this.upgraded$ = this.upgradedSource.asObservable();
    this.settings = new Subject<SettingsMessage>();
    this.settings$ = this.settings.asObservable();
  }

  // ** initialise.. set state.appId **
  init(appId = this.id) {
    this.state.appId = appId;
  }

  //** write debug information to console in devMode only **
  debug(...e: Array<unknown>) {
    e.unshift('debug:');
    if (this.devMode) {
      console.info(...e);
    }
  }

  /** Check versions to detect application update
   * emits:  observable event app.upgraded$
   * returns: {result: [null || new || update], previous: [null || prev version], new: info.version} **/
  checkVersion() {
    const cv = this.loadInfo();
    const value: AppUpdateMessage = {
      result: null,
      previous: cv.version || null,
      new: this.version
    };
    if (cv.version) {
      // ** check for newer version **
      if (this.version.indexOf(cv.version) === -1) {
        value.result = 'update';
        this.debug(
          `AppFacade: Version update detected.. (${cv.version} -> ${this.version})`,
          'info'
        );
        this.upgradedSource.next(value);
      }
    } else {
      // **  new install **
      value.result = 'new';
      this.saveInfo();
      this.debug(`AppFacade: New Install detected.. (${this.version})`, 'info');
      this.upgradedSource.next(value);
    }
    return value;
  }

  //** load app version Info **
  loadInfo() {
    return this.state.loadInfo();
  }

  //** persist version info **
  saveInfo() {
    this.state.saveInfo({
      name: this.shortName,
      version: this.version
    });
  }

  //** load app config **
  loadConfig() {
    this.config = this.state.loadConfig(this.config);
    this.settings.next({ action: 'load', setting: 'config' });
  }

  //** load app data **
  loadData() {
    this.data = this.state.loadData(this.data);
    this.settings.next({ action: 'load', setting: 'data' });
  }

  //** persist app config **
  saveConfig(options?: SettingsSaveOptions) {
    this.state.saveConfig(this.config);
    this.settings.next({ action: 'save', setting: 'config', options: options });
  }

  //** persist app data **
  saveData() {
    this.state.saveData(this.data);
    this.settings.next({ action: 'save', setting: 'data' });
  }
}
