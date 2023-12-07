/** ******************************
 * SignalK to GPX resource handler
 * ******************************/
import {
  GPX,
  GPXRoute,
  GPXWaypoint,
  GPXTrack,
  GPXTrackSegment
} from '../gpxlib';

export class SK2GPX {
  public gpx: GPX;

  constructor() {
    this.init();
  }

  init() {
    this.gpx = new GPX();
    this.gpx.metadata.name = 'Signal K Resource Export';
    this.gpx.metadata.desc = 'Freeboard export of Signal K resources';
  }

  toXML() {
    return this.gpx.toXML();
  }

  /** add GPXRoutes to GPX object from supplied SK resources
   * add only routes with supplied ids (add all if ids=undefined)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRoutes(routes: { [key: string]: any }, ids?: string[]) {
    if (!ids) {
      // ** process all
      for (const i in routes) {
        this.gpx.rte.push(this.packageRoute(i, routes[i]));
      }
    } else {
      // ** process selected ids
      ids.forEach((i) => {
        if (routes[i]) {
          this.gpx.rte.push(this.packageRoute(i, routes[i]));
        }
      });
    }
  }

  // ** return GPXRoute from SK Route wpt: waypoints to get start, end details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageRoute(uuid: string, r: any) {
    const rte = new GPXRoute();
    rte.extensions = rte.extensions ?? {};
    rte.extensions['signalk'] = {};
    rte.extensions['signalk']['uuid'] = uuid;
    if (r.distance) {
      rte.extensions['signalk']['distance'] = r.distance;
    }
    // ** route properties **
    rte.name = r.name || null;
    rte.desc = r.description || null;
    rte.cmt = r.feature.properties['cmt'] || null;
    rte.src = r.feature.properties['src'] || null;
    rte.number = r.feature.properties['number'] || null;
    rte.type = r.feature.properties['type'] || null;
    // ** add points **
    for (const p of r.feature.geometry.coordinates) {
      const pt = new GPXWaypoint();
      pt.lon = p[0];
      pt.lat = p[1];
      pt.ele = p[2] || null;
      rte.rtept.push(pt);
      this.gpx.updateBounds(pt);
    }
    return rte;
  }

  /** add GPXWaypoints to GPX object from supplied SK waypoints
   * add only waypoints with supplied ids (add all if ids=null)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWaypoints(waypoints: { [key: string]: any }, ids?: string[]) {
    if (!ids) {
      // ** process all
      for (const i in waypoints) {
        this.gpx.wpt.push(this.packageWaypoint(i, waypoints[i]));
      }
    } else {
      // ** process selected ids
      ids.forEach((i) => {
        if (waypoints[i]) {
          this.gpx.wpt.push(this.packageWaypoint(i, waypoints[i]));
        }
      });
    }
  }

  // ** return GPXWaypoint from SK Waypoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageWaypoint(uuid: string, w: any) {
    const wpt = new GPXWaypoint();
    wpt.extensions = wpt.extensions || {};
    wpt.extensions['signalk'] = {};
    wpt.extensions['signalk']['uuid'] = uuid;
    // ** waypoint properties **
    wpt.name = w.name || '';
    wpt.desc = w.description || '';
    wpt.cmt = w.feature.properties['cmt'] || null;
    wpt.geoidHeight = w.feature.properties['geoidHeight'] || null;
    wpt.src = w.feature.properties['src'] || null;
    wpt.sym = w.feature.properties['sym'] || null;
    wpt.type = w.feature.properties['type'] || null;
    wpt.fix = w.feature.properties['fix'] || null;
    wpt.sat = w.feature.properties['sat'] || null;
    wpt.hdop = w.feature.properties['hdop'] || null;
    wpt.vdop = w.feature.properties['vdop'] || null;
    wpt.pdop = w.feature.properties['pdop'] || null;
    wpt.ageOfGpsData = w.feature.properties['ageOfGpsData'] || null;
    wpt.dgpsid = w.feature.properties['dgpsid'] || null;
    wpt.lat = w.feature.geometry.coordinates[1];
    wpt.lon = w.feature.geometry.coordinates[0];
    wpt.ele = w.feature.geometry.coordinates[2] || null;
    this.gpx.updateBounds(wpt);
    return wpt;
  }

  /** add GPXTracks to GPX object from supplied SK tracks
   * add only tracks with supplied ids (add all if ids=null)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTracks(tracks: { [key: string]: any }, ids?: string[]) {
    if (!ids) {
      // ** process all
      for (const i in tracks) {
        this.gpx.trk.push(this.packageTrack(i, tracks[i]));
      }
    } else {
      // ** process selected ids
      ids.forEach((i) => {
        if (tracks[i]) {
          this.gpx.trk.push(this.packageTrack(i, tracks[i]));
        }
      });
    }
  }

  // ** return GPXTrack from SK Track
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageTrack(uuid: string, t: any) {
    const trk = new GPXTrack();
    trk.extensions = trk.extensions || {};
    trk.extensions['signalk'] = {};
    trk.extensions['signalk']['uuid'] = uuid;
    // ** track properties **
    trk.name = t.feature.properties['name'] || null;
    trk.desc = t.feature.properties['description'] || null;
    trk.cmt = t.feature.properties['cmt'] || null;
    trk.src = t.feature.properties['src'] || null;
    trk.number = t.feature.properties['number'] || null;
    trk.type = t.feature.properties['type'] || null;

    // ** add segments **
    for (const s of t.feature.geometry.coordinates) {
      const seg = new GPXTrackSegment();
      for (const p of s) {
        const pt = new GPXWaypoint();
        pt.lon = p[0];
        pt.lat = p[1];
        pt.ele = p[2] || null;
        seg.trkpt.push(pt);
        this.gpx.updateBounds(pt);
      }
      trk.trkseg.push(seg);
    }
    return trk;
  }
}
