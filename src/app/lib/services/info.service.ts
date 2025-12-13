//*************************************
//** Application Information Service **
//*************************************
import { isDevMode } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { State } from './state.service';
import { IAppConfig, FBAppData } from '../../types';

export type ConfigEvent = 'saved' | 'ready';

export interface AppInfoDef {
  id: string;
  name: string;
  description: string;
  version: string;
  url?: string;
  logo?: string;
}

export class InfoService {
  public config!: IAppConfig;
  public data!: FBAppData;

  public name = '';
  public description = ``;
  public version = '';
  public url = '';
  public logo = './assets/img/app_logo.png';

  public launchStatus!: {
    result: 'current' | 'major' | 'minor' | 'patch' | 'first_run';
    previousVersion: string;
  };

  protected devMode: boolean;
  protected suppressPersist = false;

  private id = '';
  private state: State;

  // Observables
  private configEvent: Subject<ConfigEvent> = new Subject<ConfigEvent>();
  public config$: Observable<ConfigEvent> = this.configEvent.asObservable();

  constructor(infoDef: AppInfoDef) {
    this.state = new State();
    this.devMode = isDevMode();

    this.id = infoDef.id ?? '_';
    this.name = infoDef.name ?? '';
    this.description = infoDef.description ?? '';
    this.version = infoDef.version ?? '0.0.0';
    this.url = infoDef.url ?? '';
    this.logo = infoDef.logo ?? '';
    this.state.appId = this.id;
    this.checkVersion();
  }

  /** write debug information to console in devMode only */
  debug(...e: Array<unknown>) {
    e.unshift('debug:');
    if (this.devMode) {
      console.info(...e);
    }
  }

  /** Check version set launchStatus */
  private checkVersion() {
    const pv = this.loadInfo().version;
    if (!pv) {
      //no previous version
      this.launchStatus = {
        result: 'first_run',
        previousVersion: ''
      };
    } else if (pv === this.version) {
      //current version
      this.launchStatus = {
        result: 'current',
        previousVersion: pv
      };
    } else {
      //changed version
      const pva = pv.split('.');
      const cva = this.version.split('.');
      if (pva[0] !== cva[0]) {
        this.launchStatus = {
          result: 'major',
          previousVersion: pv
        };
      } else if (pva[1] !== cva[1]) {
        this.launchStatus = {
          result: 'minor',
          previousVersion: pv
        };
      } else {
        this.launchStatus = {
          result: 'patch',
          previousVersion: pv
        };
      }
    }

    this.saveInfo();
    this.debug(`Version Check:`, this.launchStatus);
  }

  /** emit config$ event */
  emitConfigEvent(value: ConfigEvent) {
    this.configEvent.next(value);
  }

  /** load app version Info */
  loadInfo(): AppInfoDef {
    return this.state.loadInfo();
  }

  /** persist version info */
  saveInfo() {
    this.state.saveInfo({
      name: this.name,
      version: this.version
    });
  }

  /** load app config */
  loadConfig() {
    this.config = this.state.loadConfig(this.config);
  }

  /** persist app config */
  saveConfig() {
    if (this.suppressPersist) {
      this.debug(`InfoService: suppressPersist = true`);
      return;
    }
    this.debug(`InfoService.saveConfig`);
    this.state.saveConfig(this.config);
    this.emitConfigEvent('saved');
  }

  /** load app data */
  loadData() {
    this.data = this.state.loadData(this.data);
  }

  /** persist app data */
  saveData() {
    this.state.saveData(this.data);
  }
}
