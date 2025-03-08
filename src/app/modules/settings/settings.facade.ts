/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { AppFacade } from 'src/app/app.facade';
import { SettingsMessage, SettingsSignals } from 'src/app/lib/services';
import { SignalKClient } from 'signalk-client-angular';
import { SKStreamFacade } from 'src/app/modules/skstream/skstream.facade';
import { Position } from 'src/app/types';

interface SKAppsList {
  author: string;
  description: string;
  license: string;
  location: string;
  _location: string; //npm linked app
  name: string;
  version: string;
}

interface ResourceTypeList {
  [key: string]: {
    $source: string;
    description: string;
  };
}

@Injectable({ providedIn: 'root' })
export class SettingsFacade {
  // **************** Settings Dialog Support ***************************
  private symDegree = String.fromCharCode(186);
  availableUnits = {
    distance: new Map([
      ['m', 'Kilometres'],
      ['ft', 'Nautical Miles']
    ]),
    depth: new Map([
      ['m', 'metres'],
      ['ft', 'feet']
    ]),
    speed: new Map([
      ['kn', 'knots'],
      ['msec', 'm/sec'],
      ['kmh', 'km/h'],
      ['mph', 'mph']
    ]),
    temperature: new Map([
      ['c', 'Celcius'],
      ['f', 'Fahrenheit']
    ])
  };

  preferredValues = {
    heading: [
      ['navigation.headingTrue', 'True'],
      ['navigation.headingMagnetic', 'Magnetic']
    ],
    wind: new Map([
      [false, 'Wind True'],
      [true, 'Wind Apparent']
    ]),
    coords: [
      ['XY', '-128.12345'],
      ['SHDd', `W-128.12345${this.symDegree}`],
      ['DMdH', `128${this.symDegree} 15.34567' W`],
      ['HDd', `W 128.12345${this.symDegree}`],
      ['HDMS', `W 128${this.symDegree}15'46"123`],
      ['DHMS', `128W15'46"123`]
    ]
  };

  list = {
    nextPointTriggers: ['perpendicularPassed', 'arrivalCircleEntered'],
    minZoom: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    resourceRadius: [0, 5, 10, 20, 50, 100, 150, 200, 500],
    noteRadius: [5, 10, 20, 50, 100, 150, 200, 500],
    applications: [],
    favourites: [],
    resourcePaths: [],
    aisTimeouts: new Map([
      [60000, '1 min'],
      [120000, '2 min'],
      [180000, '3 min'],
      [360000, '6 min'],
      [540000, '9 min'],
      [15 * 60000, '15 min'],
      [30 * 60000, '30 min'],
      [60 * 60000, '1 hr'],
      [24 * 60 * 60000, '24 hrs']
    ]),
    aisMaxRadius: new Map([
      [0, 'None'],
      [10000, '5 NM (10km)'],
      [20000, '10 NM (20km)'],
      [30000, '15 NM (30km)'],
      [40000, '20 NM (40km)'],
      [50000, '25 NM (50km)'],
      [75000, '40 NM (75km)'],
      [100000, '55 NM (100km)']
    ]),
    aisCogLine: new Map([
      [0, 'Off'],
      [10, '10 min'],
      [30, '30 min'],
      [60, '60 min']
    ]),
    aisProfiles: new Map([[0, 'Default']]) //,[1,'Navigation'] ])
  };

  vesselOptions = {
    headingLine: new Map([
      [-1, 'Default'],
      [1, '1 NM (2km)'],
      [2, '2 NM (4km)'],
      [5, '5 NM (10km)'],
      [10, '10 NM (20km)'],
      [15, '15 NM (30km)'],
      [20, '20 NM (40km)'],
      [50, '50 NM (90km)'],
      [100, '100 NM (180km)']
    ]),
    cogLine: new Map([
      [0, 'None'],
      [5, '5 min'],
      [10, '10 min'],
      [30, '30 min'],
      [60, '60 min'],
      [2 * 60, '2 hrs'],
      [24 * 60, '24 hrs']
    ])
  };

  alarmOptions = {
    smoothing: new Map([
      [5000, '5 secs'],
      [10000, '10 secs'],
      [20000, '20 secs'],
      [30000, '30 secs']
    ])
  };

  darkModeOptions = new Map([
    [0, 'Use OS setting'],
    [1, 'Use Signal K Mode'],
    [-1, 'On']
  ]);

  trailOptions = {
    highResolution: new Map([
      ['1s', '1 sec'],
      ['5s', '5 secs'],
      ['10s', '10 secs'],
      ['30s', '30 secs'],
      ['1m', '1 min']
    ]),
    mediumResolution: new Map([
      ['10s', '10 secs'],
      ['30s', '30 secs'],
      ['1m', '1 min'],
      ['2m', '2 mins'],
      ['5m', '5 mins'],
      ['10m', '10 mins'],
      ['15m', '15 mins'],
      ['30m', '30 mins']
    ])
  };

  fixedPosition = [0, 0];

  s57Options = {
    graphicsStyle: new Map([
      ['Simplified', 'Simplified'],
      ['Paper', 'Paper chart']
    ]),
    boundaries: new Map([
      ['Symbolized', 'Symbolized'],
      ['Plain', 'Plain']
    ]),
    colors: [2, 4],
    shallowDepth: 2,
    safetyDepth: 3,
    deepDepth: 6
  };

  // *****************************************************
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public settings!: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data!: any;

  update$() {
    return this.app.settings$;
  }
  saved$() {
    return this.configSavedSource.asObservable();
  }
  loaded$() {
    return this.configLoadedSource.asObservable();
  }

  // ******************************************************
  private configSavedSource = new Subject<SettingsMessage>();
  private configLoadedSource = new Subject<SettingsMessage>();
  // *******************************************************

  constructor(
    private app: AppFacade,
    public signalk: SignalKClient,
    private stream: SKStreamFacade
  ) {
    this.data = this.app.data;
    this.settings = this.app.config;
    this.fixedPosition = this.settings.fixedPosition.slice();

    if (!this.app.config.chartApi) {
      this.app.config.chartApi = 1;
    }
    this.app.settings$.subscribe((r: SettingsMessage) => {
      if (r.setting === 'config') {
        if (r.action === 'load') {
          this.configLoadedSource.next(r);
        }
        if (r.action === 'save') {
          this.configSavedSource.next(r);
        }
      }
    });
  }

  // delete auth token
  clearToken() {
    this.app.persistToken(null);
  }

  // refresh dynamic data from sources
  refresh() {
    this.settings = this.app.config;
    this.fixedPosition = this.settings.fixedPosition.slice();
    this.getApps();
    this.getResourcePaths();
  }

  // ** populate list of available non-standard resource paths
  private getResourcePaths() {
    this.signalk.api.get(this.app.skApiVersion, 'resources').subscribe(
      (r: ResourceTypeList) => {
        this.list.resourcePaths = Object.keys(r)
          .filter((i: string) => {
            return ![
              'routes',
              'waypoints',
              'notes',
              'regions',
              'charts'
            ].includes(i);
          })
          .sort();
      },
      () => (this.list.resourcePaths = [])
    );
  }

  // ** populate applications list **
  private getApps() {
    // apps list - default an entry to stored config value
    if (this.app.config.plugins.instruments) {
      this.list.applications.push(this.app.config.plugins.instruments);
    }

    this.signalk.apps.list().subscribe(
      (a: Array<SKAppsList>) => {
        this.list.applications = a
          .map((i) => {
            if (i.name === '@signalk/freeboard-sk') {
              return null;
            }
            if (!i._location && !i.location) {
              // npm linked app
              return {
                name: i.name,
                description: i.description,
                url: `/${i.name}`
              };
            }
            if (typeof i._location !== 'undefined') {
              // legacywebapps list
              const x = i._location.indexOf('/signalk-server/');
              return {
                name: i.name,
                description: i.description,
                url: x === -1 ? i._location : i._location.slice(15)
              };
            } else if (typeof i.location !== 'undefined') {
              return {
                name: i.name,
                description: i.description,
                url: i.location
              };
            }
          })
          .filter((e) => {
            return e;
          });

        this.list.applications.unshift({
          name: 'None',
          description: '',
          url: null
        });

        this.buildFavouritesList();
      },
      () => {
        this.app.debug('ERROR retrieving AppList!');
      }
    );
  }

  // ** favourites **
  buildFavouritesList() {
    this.list.favourites = this.list.applications.slice(1);
    const i = this.app.config.selections.pluginFavourites.indexOf(
      this.app.config.plugins.instruments
    );
    if (i !== -1) {
      this.app.config.selections.pluginFavourites.splice(i, 1);
    }
  }

  applySettings(signals?: SettingsSignals) {
    this.app.debug('Saving Settings..');
    if (!this.app.config.selections.vessel.trail) {
      this.app.config.selections.trailFromServer = false;
    }
    if (
      typeof this.fixedPosition[0] === 'number' &&
      typeof this.fixedPosition[1] === 'number'
    ) {
      this.settings.fixedPosition = this.fixedPosition.slice();
      if (this.settings.fixedLocationMode) {
        this.app.data.vessels.self.position =
          this.fixedPosition.slice() as Position;
      }
    }
    this.app.saveConfig(signals ?? {});
  }
}
