import { effect, Injectable } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from '../skstream/skstream.service';
import { SKResourceService, SKVessel } from '../skresources';
import { FBRoute, SKPosition, UpdateMessage } from 'src/app/types';
import { HttpErrorResponse } from '@angular/common/http';
import { Convert } from 'src/app/lib/convert';

// ** Signal K course operations
@Injectable({ providedIn: 'root' })
export class CourseService {
  constructor(
    private signalk: SignalKClient,
    private app: AppFacade,
    private skres: SKResourceService
  ) {
    // routes signal handler
    effect(() => {
      if (this.skres.routes()) {
        this.handleRoutesSignal();
      }
    });
  }

  /**
   * @description Set route as active destintation
   * @param id Route identifier
   * @param startPoint Index of point in route to set as the active destination
   * @param reverse Follow route in reverse point order
   */
  public activateRoute(id: string, startPoint = 0, reverse = false) {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute',
        {
          href: `/resources/routes/${id}`,
          reverse: reverse,
          pointIndex: startPoint
        }
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Set waypoint as nextPoint
   * @param id Waypoint identifier to set as destination.
   */
  public navigateToWaypoint(id: string) {
    this.setDestination(`/resources/waypoints/${id}`);
  }

  /**
   * @description Clear / Cancel destintation
   */
  public clearCourse() {
    this.signalk.api
      .delete(this.app.skApiVersion, `vessels/self/navigation/course`)
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Set active destintation
   * @param value resource HREF or Signal K position object
   */
  public setDestination(value: SKPosition | string) {
    let v: any;
    if (typeof value === 'string') {
      //href
      v = { href: value };
    } else {
      // position
      v = { position: value };
    }
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/destination',
        v
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Restart course
   */
  public courseRestart() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/restart',
        null
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Refresh route
   */
  public courseRefresh() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute/refresh',
        null
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Reverse course direction
   */
  public courseReverse() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute/reverse',
        null
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Set destination to the route point with the supplied index.
   * @param pointIndex 0 based index of route point.
   */
  public coursePointIndex(pointIndex: number) {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        `navigation/course/activeRoute/pointIndex`,
        {
          value: pointIndex
        }
      )
      .subscribe(
        () => undefined,
        (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      );
  }

  /**
   * @description Process self vessel course data and update signal(s)
   * @param self vessel
   */
  public parseSelf(self: SKVessel) {
    if (typeof self.courseApi !== 'undefined') {
      this.processCourseApi(self.courseApi);
    }
    this.processCourseCalcs(self);

    /** @todo Replace this.navDataUpdate.next() with Course signal(s) */
  }

  /**
   * @description Process courseApi values into navData
   * @value Vessel courseApi data
   */
  private processCourseApi(value: any) {
    const clearCourseData = () => {
      this.app.data.navData.startPosition = null;
      this.app.data.navData.position = null;
      this.app.data.activeWaypoint = null;
      clearRouteData();
    };

    const clearRouteData = () => {
      this.app.data.activeRoute = null;
      this.app.data.navData.pointIndex = -1;
      this.app.data.navData.pointTotal = 0;
      this.app.data.navData.pointNames = [];
      this.app.data.navData.destPointName = '';
      this.app.data.activeRouteReversed = false;
    };

    if (!value) {
      clearCourseData();
      return;
    }

    // navData.arrivalCircle
    if (typeof value.arrivalCircle !== 'undefined') {
      this.app.data.navData.arrivalCircle = value.arrivalCircle;
    }

    if (!value.nextPoint || !value.previousPoint) {
      clearCourseData();
    }

    if (value.nextPoint && value.previousPoint) {
      // navData.startPosition
      this.app.data.navData.startPosition = value?.previousPoint?.position
        ? [
            value.previousPoint.position.longitude,
            value.previousPoint.position.latitude
          ]
        : null;

      // navData.position
      this.app.data.navData.position = value?.nextPoint?.position
        ? [
            value.nextPoint.position.longitude,
            value.nextPoint.position.latitude
          ]
        : null;

      // wpt / route hrefs
      if (value?.nextPoint.href) {
        const wptHref = value.nextPoint.href.split('/');
        this.app.data.activeWaypoint = wptHref[wptHref.length - 1];
        const wpt = this.skres.fromCache(
          'waypoints',
          this.app.data.activeWaypoint
        );
        if (!wpt) {
          this.skres.waypointAddFromServer([this.app.data.activeWaypoint]);
        }
      } else {
        this.app.data.activeWaypoint = null;
      }
    }

    // navData.activeRoute
    if (!value.activeRoute) {
      clearRouteData();
    } else {
      if (value?.activeRoute.href) {
        this.app.data.navData.destPointName = '';
        const rteHref = value.activeRoute.href.split('/');
        this.app.data.activeRoute = rteHref[rteHref.length - 1];

        this.app.data.activeWaypoint = null;
        this.app.data.navData.pointIndex =
          value?.activeRoute.pointIndex === null
            ? -1
            : value?.activeRoute.pointIndex;
        this.app.data.navData.pointTotal =
          value?.activeRoute.pointTotal === null
            ? 0
            : value?.activeRoute.pointTotal;
        this.app.data.activeRouteReversed = !value?.activeRoute.reverse
          ? false
          : value?.activeRoute.reverse;

        const rte = this.skres.fromCache('routes', this.app.data.activeRoute);
        if (!rte) {
          // add route to cache
          this.skres.routeAddFromServer([this.app.data.activeRoute]);
          // handleRouteSignal() updates activeRoute point details from cache
        } else {
          this.updateActiveRoutePointDetails(rte);
        }
      } else {
        this.app.data.activeRoute = null;
        /** @todo Remediate Non-signal k source (n2k) route points. */
        /*if (value.activeRoute.waypoints) {
          const n2kRoute = new SKRoute();
          n2kRoute.name = value.activeRoute?.name ?? 'From NMEA2000';
          n2kRoute.description = 'Route from NMEA2000 source';
          n2kRoute.feature.geometry.coordinates =
            value.activeRoute?.waypoints.map((pt) => {
              return [pt.position.longitude, pt.position.latitude];
            });
          const c = n2kRoute.feature.geometry.coordinates;
          n2kRoute.feature.geometry.coordinates = c;
          n2kRoute.distance = GeoUtils.routeLength(
            n2kRoute.feature.geometry.coordinates
          );
          this.app.data.n2kRoute = ['n2k', n2kRoute, true];
        } else {
          this.app.data.n2kRoute = null;
        }*/
      }
    }
  }

  /**
   * @description Process course calcValues into navData
   * @param v self vessel
   */
  private processCourseCalcs(v: SKVessel) {
    // ** process preferred course data **
    if (typeof v.courseCalcs.crossTrackError !== 'undefined') {
      this.app.data.navData.xte =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.crossTrackError / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs.crossTrackError / 1000);
    }

    if (typeof v.courseCalcs.bearingTrue !== 'undefined') {
      this.app.data.navData.bearingTrue = Convert.radiansToDegrees(
        v.courseCalcs.bearingTrue
      );
      if (!this.app.useMagnetic) {
        this.app.data.navData.bearing.value = this.app.data.navData.bearingTrue;
        this.app.data.navData.bearing.type = 'T';
      }
    }

    if (typeof v.courseCalcs.bearingMagnetic !== 'undefined') {
      this.app.data.navData.bearingMagnetic = Convert.radiansToDegrees(
        v.courseCalcs.bearingMagnetic
      );
      if (this.app.useMagnetic) {
        this.app.data.navData.bearing.value =
          this.app.data.navData.bearingMagnetic;
        this.app.data.navData.bearing.type = 'M';
      }
    }

    if (typeof v.courseCalcs.velocityMadeGood !== 'undefined') {
      this.app.data.navData.vmg = v.courseCalcs.velocityMadeGood;
    }

    if (typeof v.courseCalcs.distance !== 'undefined') {
      this.app.data.navData.dtg =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.distance / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs.distance / 1000);
    }

    if (typeof v.courseCalcs['route.distance'] !== 'undefined') {
      this.app.data.navData.route.dtg =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.distance / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs['route.distance'] / 1000);
    }

    if (typeof v.courseCalcs.timeToGo !== 'undefined') {
      this.app.data.navData.ttg = v.courseCalcs.timeToGo / 60;
    }

    if (typeof v.courseCalcs['route.timeToGo'] !== 'undefined') {
      this.app.data.navData.route.ttg = v.courseCalcs['route.timeToGo'] / 60;
    }

    if (typeof v.courseCalcs.estimatedTimeOfArrival !== 'undefined') {
      if (v.courseCalcs.estimatedTimeOfArrival !== null) {
        let d: Date | null = new Date(v.courseCalcs.estimatedTimeOfArrival);
        this.app.data.navData.eta =
          d instanceof Date && !isNaN(d as any) ? d : null;
      } else {
        this.app.data.navData.eta = null;
      }
    }

    if (typeof v.courseCalcs['route.estimatedTimeOfArrival'] !== 'undefined') {
      if (v.courseCalcs['route.estimatedTimeOfArrival'] !== null) {
        let d: Date | null = new Date(
          v.courseCalcs['route.estimatedTimeOfArrival']
        );
        this.app.data.navData.route.eta =
          d instanceof Date && !isNaN(d as any) ? d : null;
      } else {
        this.app.data.navData.route.eta = null;
      }
    }
  }

  /**
   * @description Update NavData with active route point details
   * @param rte Active Route
   */
  private updateActiveRoutePointDetails(rte: FBRoute) {
    this.app.data.navData.activeRoutePoints =
      rte[1].feature.geometry.coordinates;

    if (Array.isArray(rte[1].feature.properties.coordinatesMeta)) {
      this.app.data.navData.pointNames =
        rte[1].feature.properties.coordinatesMeta.map((pt) => {
          return pt.name ?? '';
        });
      if (
        this.app.data.navData.pointIndex !== -1 &&
        this.app.data.navData.pointIndex <
          this.app.data.navData.pointNames.length
      ) {
        this.app.data.navData.destPointName =
          this.app.data.navData.pointNames[this.app.data.navData.pointIndex];
      }
    }
    // is route circular?
    const coords = rte[1].feature.geometry.coordinates;
    this.app.data.activeRouteCircular =
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1]
        ? true
        : false;
  }

  /**
   * @description Handle routes() signal to update activeRoute point details
   */
  private handleRoutesSignal() {
    if (!this.app.data.activeRoute) {
      return;
    }
    const rte: FBRoute = this.skres.fromCache(
      'routes',
      this.app.data.activeRoute
    );
    if (rte) {
      this.updateActiveRoutePointDetails(rte);
    }
  }
}
