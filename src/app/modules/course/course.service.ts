import { effect, Injectable, signal } from '@angular/core';

import { SignalKClient } from 'signalk-client-angular';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKVessel } from '../skresources';
import { CourseData, FBRoute, SKPosition } from 'src/app/types';
import { HttpErrorResponse } from '@angular/common/http';
import { Convert } from 'src/app/lib/convert';

// ** Signal K course operations
@Injectable({ providedIn: 'root' })
export class CourseService {
  private _courseData = signal<CourseData>({
    dtg: null,
    ttg: null,
    eta: null,
    route: {
      dtg: null,
      ttg: null,
      eta: null
    },
    bearing: { value: null, type: null },
    bearingTrue: null,
    bearingMagnetic: null,
    xte: null,
    vmg: null,
    position: null,
    pointIndex: -1,
    pointTotal: 0,
    arrivalCircle: null,
    startPosition: null,
    pointNames: [],
    activeRoutePoints: [],
    destPointName: ''
  });
  readonly courseData = this._courseData.asReadonly();

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
          pointIndex: startPoint,
          arrivalCircle: this.app.config.course.arrivalCircle
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
        Object.assign(v, {
          arrivalCircle: this.app.config.course.arrivalCircle
        })
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
      this.processCourseData(self.courseApi);
    }
    this.processCourseCalcs(self);
  }

  /** Initialise courseData Signal */
  public initCourseData() {
    this._courseData.update((current) => {
      return {
        dtg: null,
        ttg: null,
        eta: null,
        route: {
          dtg: null,
          ttg: null,
          eta: null
        },
        bearing: { value: null, type: null },
        bearingTrue: null,
        bearingMagnetic: null,
        xte: null,
        vmg: null,
        position: [null, null],
        pointIndex: current.pointIndex,
        pointTotal: 0,
        arrivalCircle: null,
        startPosition: [null, null],
        pointNames: [],
        activeRoutePoints: null,
        destPointName: ''
      };
    });
  }

  /** Update CourseData Signal */
  private processCourseData(value: any) {
    const clearCourse = (value: CourseData) => {
      value.position = null;
      value.startPosition = null;
      this.app.data.activeWaypoint = null;
      return clearRoute(value);
    };

    const clearRoute = (value: CourseData) => {
      value.pointIndex = -1;
      value.pointTotal = 0;
      value.pointNames = [];
      value.destPointName = '';
      this.app.data.activeRoute = null;
      this.app.data.activeRouteReversed = false;
      return value;
    };

    if (!value) {
      // clear course data signal
      this._courseData.update((current: CourseData) => {
        return Object.assign({}, clearCourse(current));
      });
      return;
    }

    let c = Object.assign({}, this._courseData());

    // navData.arrivalCircle
    if (typeof value.arrivalCircle !== 'undefined') {
      c.arrivalCircle = value.arrivalCircle;
    }

    if (!value.nextPoint || !value.previousPoint) {
      // no destination or source location
      c = clearCourse(c);
    }

    if (value.nextPoint && value.previousPoint) {
      // navData.startPosition
      c.startPosition = value?.previousPoint?.position
        ? [
            value.previousPoint.position.longitude,
            value.previousPoint.position.latitude
          ]
        : null;

      // navData.position
      c.position = value?.nextPoint?.position
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
      c = clearRoute(c);
    } else {
      if (value?.activeRoute.href) {
        c.destPointName = '';
        const rteHref = value.activeRoute.href.split('/');
        this.app.data.activeRoute = rteHref[rteHref.length - 1];

        this.app.data.activeWaypoint = null;
        c.pointIndex =
          value?.activeRoute.pointIndex === null
            ? -1
            : value?.activeRoute.pointIndex;
        c.pointTotal =
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
          this.updateActiveRoutePointDetails(c, rte);
        }
      } else {
        this.app.data.activeRoute = null;
      }
    }
    this._courseData.update(() => c);
  }

  /**
   * @description Process course calcValues into navData
   * @param v self vessel
   */
  private processCourseCalcs(v: SKVessel) {
    let c = Object.assign({}, this._courseData());

    // ** process preferred course data **
    if (typeof v.courseCalcs.crossTrackError !== 'undefined') {
      c.xte =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.crossTrackError / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs.crossTrackError / 1000);
    }

    if (typeof v.courseCalcs.bearingTrue !== 'undefined') {
      c.bearingTrue = Convert.radiansToDegrees(v.courseCalcs.bearingTrue);
      if (!this.app.useMagnetic) {
        c.bearing.value = c.bearingTrue;
        c.bearing.type = 'T';
      }
    }

    if (typeof v.courseCalcs.bearingMagnetic !== 'undefined') {
      c.bearingMagnetic = Convert.radiansToDegrees(
        v.courseCalcs.bearingMagnetic
      );
      if (this.app.useMagnetic) {
        c.bearing.value = c.bearingMagnetic;
        c.bearing.type = 'M';
      }
    }

    if (typeof v.courseCalcs.velocityMadeGood !== 'undefined') {
      c.vmg = v.courseCalcs.velocityMadeGood;
    }

    if (typeof v.courseCalcs.distance !== 'undefined') {
      c.dtg =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.distance / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs.distance / 1000);
    }

    if (typeof v.courseCalcs['route.distance'] !== 'undefined') {
      c.route.dtg =
        this.app.config.units.distance === 'm'
          ? v.courseCalcs.distance / 1000
          : Convert.kmToNauticalMiles(v.courseCalcs['route.distance'] / 1000);
    }

    if (typeof v.courseCalcs.timeToGo !== 'undefined') {
      c.ttg = v.courseCalcs.timeToGo / 60;
    }

    if (typeof v.courseCalcs['route.timeToGo'] !== 'undefined') {
      c.route.ttg = v.courseCalcs['route.timeToGo'] / 60;
    }

    if (typeof v.courseCalcs.estimatedTimeOfArrival !== 'undefined') {
      if (v.courseCalcs.estimatedTimeOfArrival !== null) {
        let d: Date | null = new Date(v.courseCalcs.estimatedTimeOfArrival);
        c.eta = d instanceof Date && !isNaN(d as any) ? d : null;
      } else {
        c.eta = null;
      }
    }

    if (typeof v.courseCalcs['route.estimatedTimeOfArrival'] !== 'undefined') {
      if (v.courseCalcs['route.estimatedTimeOfArrival'] !== null) {
        let d: Date | null = new Date(
          v.courseCalcs['route.estimatedTimeOfArrival']
        );
        c.route.eta = d instanceof Date && !isNaN(d as any) ? d : null;
      } else {
        c.route.eta = null;
      }
    }

    this._courseData.update(() => c);
  }

  /**
   * @description Update NavData with active route point details
   * @param rte Active Route
   */
  private updateActiveRoutePointDetails(c: CourseData, rte: FBRoute) {
    c.activeRoutePoints = rte[1].feature.geometry.coordinates;

    if (Array.isArray(rte[1].feature.properties.coordinatesMeta)) {
      c.pointNames = rte[1].feature.properties.coordinatesMeta.map((pt) => {
        return pt.name ?? '';
      });
      if (c.pointIndex !== -1 && c.pointIndex < c.pointNames.length) {
        c.destPointName = c.pointNames[c.pointIndex];
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
      const c = this._courseData();
      this.updateActiveRoutePointDetails(c, rte);
      this._courseData.update(() => c);
    }
  }
}
