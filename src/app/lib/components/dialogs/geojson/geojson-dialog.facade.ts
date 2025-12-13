/** GeoJSON abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'signalk-client-angular';
import {
  SKResourceService,
  SKRoute,
  SKWaypoint,
  SKRegion,
  SKTrack
} from 'src/app/modules';
import {
  LineStringFeature,
  MultiLineStringFeature,
  PointFeature,
  PolygonFeature
} from 'src/app/types';
import { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';

@Injectable({ providedIn: 'root' })
export class GeoJSONLoadFacade {
  // **************** ATTRIBUTES ***************************
  private errorCount = 0;
  private subCount = 0;

  private uploadSource: Subject<number>;
  public uploaded$: Observable<number>;

  // *******************************************************

  constructor(
    private app: AppFacade,
    private skres: SKResourceService,
    public signalk: SignalKClient
  ) {
    this.uploadSource = new Subject<number>();
    this.uploaded$ = this.uploadSource.asObservable();
  }

  // ** parse GeoJSON file
  validate(fileData: string) {
    try {
      const data = JSON.parse(fileData);
      if (
        typeof data.type === 'undefined' ||
        data.type !== 'FeatureCollection'
      ) {
        return null;
      }
      if (
        typeof data.features === 'undefined' ||
        !Array.isArray(data.features)
      ) {
        return null;
      }
      // ** check each feature schema
      data.features.forEach((f) => {
        if (f.type && f.type === 'Feature' && f.geometry && f.geometry.type) {
          if (!f.properties) {
            f.properties = {};
          }
        }
      });
      return data;
    } catch (err) {
      return null;
    }
  }

  // ** upload selected features to Signal K server **
  uploadToServer(data: GeoJSONFeatureCollection) {
    this.errorCount = 0;
    this.subCount = 0;

    data.features.forEach((f) => {
      if (f.type && f.type === 'Feature' && f.geometry && f.geometry.type) {
        switch (f.geometry.type) {
          case 'LineString': // route
            this.transformRoute(f as LineStringFeature);
            break;
          case 'Point': // waypoint
            this.transformWaypoint(f as PointFeature);
            break;
          case 'MultiLineString': // track
            this.transformTrack(f as MultiLineStringFeature);
            break;
          case 'Polygon': // region
          case 'MultiPolygon':
            this.transformRegion(f as PolygonFeature);
            break;
        }
      } else {
        console.warn('Parse GeoJSON: invalid feature data!');
      }
    });
  }

  // ** check all submissions are resolved and emit upload$
  checkComplete() {
    if (this.subCount === 0) {
      this.uploadSource.next(this.errorCount);
      this.app.debug(`GeoJSONLoad: complete: ${this.errorCount}`);
    }
  }

  // ** transform and upload route
  transformRoute(f: LineStringFeature) {
    // SKRoute POST payload
    const r = new SKRoute();
    if (!f.properties) {
      f.properties = {};
    }

    if (typeof f.properties.name !== 'undefined') {
      r.name = f.properties.name ?? '';
      delete f.properties.name;
    } else {
      r.name = `rte-${new Date().getTime()}`;
    }

    if (typeof f.properties.description !== 'undefined') {
      r.description = f.properties.description ?? '';
      delete f.properties.description;
    } else {
      r.description = 'GeoJSON import';
    }

    r.feature = f;

    this.subCount++;
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/routes`, r)
      .subscribe(
        (r) => {
          this.subCount--;
          if (r['state'] === 'COMPLETED') {
            this.app.debug('SUCCESS: GeoJSON Route added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        () => {
          this.errorCount++;
          this.subCount--;
          this.checkComplete();
        }
      );
  }

  // ** transform and upload waypoint
  transformWaypoint(f: PointFeature) {
    // SKWaypoint POST payload
    const w = new SKWaypoint();
    if (!f.properties) {
      f.properties = {};
    }

    if (typeof f.properties.name !== 'undefined') {
      w.name = f.properties.name ?? '';
      delete f.properties.name;
    } else {
      w.name = `wpt-${new Date().getTime()}`;
    }

    if (typeof f.properties.description !== 'undefined') {
      w.description = f.properties.description ?? '';
      delete f.properties.description;
    } else {
      w.description = 'GeoJSON import';
    }

    w.feature = f;

    this.subCount++;
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/waypoints`, w)
      .subscribe(
        (r) => {
          this.subCount--;
          if (r['state'] === 'COMPLETED') {
            this.app.debug('SUCCESS: GeoJSON Waypoint added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        () => {
          this.errorCount++;
          this.subCount--;
          this.checkComplete();
        }
      );
  }

  // ** transform and upload track
  transformTrack(f: MultiLineStringFeature) {
    if (!f.properties) {
      f.properties = {};
    }
    f.properties.name =
      typeof f.properties.name !== 'undefined'
        ? (f.properties.name ?? '')
        : `trk-${new Date().getTime()}`;
    f.properties.description =
      typeof f.properties.description !== 'undefined'
        ? (f.properties.description ?? '')
        : 'GeoJSON import';

    const r = new SKTrack({ feature: f });
    this.subCount++;
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/tracks`, r)
      .subscribe(
        (r) => {
          this.subCount--;
          if (r['state'] === 'COMPLETED') {
            this.app.debug('SUCCESS: GeoJSON Track added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        () => {
          this.errorCount++;
          this.subCount--;
          this.checkComplete();
        }
      );
  }

  // ** transform and upload region
  transformRegion(f: PolygonFeature) {
    // SKRegion POST payload
    const r = new SKRegion();
    if (!f.properties) {
      f.properties = {};
    }
    if (typeof f.properties.name !== 'undefined') {
      r.name = f.properties.name ?? '';
      delete f.properties.name;
    } else {
      r.name = `reg-${new Date().getTime()}`;
    }

    if (typeof f.properties.description !== 'undefined') {
      r.description = f.properties.description ?? '';
      delete f.properties.description;
    } else {
      r.description = 'GeoJSON import';
    }
    r.feature = f;

    this.subCount++;
    this.signalk.api
      .post(this.app.skApiVersion, `/resources/regions`, r)
      .subscribe(
        (r) => {
          this.subCount--;
          if (r['state'] === 'COMPLETED') {
            this.app.debug('SUCCESS: GeoJSON Region added.');
          } else {
            this.errorCount++;
          }
          this.checkComplete();
        },
        () => {
          this.errorCount++;
          this.subCount--;
          this.checkComplete();
        }
      );
  }
}
