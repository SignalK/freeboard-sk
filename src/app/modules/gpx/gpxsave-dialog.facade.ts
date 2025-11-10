/** Settings abstraction Facade
 * ************************************/
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SK2GPX } from './sk2gpx';
import { SKTrack } from 'src/app/modules';
import { SignalKClient } from 'signalk-client-angular';

@Injectable({ providedIn: 'root' })
export class GPXSaveFacade {
  // **************** ATTRIBUTES ***************************
  private resultSource: Subject<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public result$: Observable<any>;
  private sk2gpx: SK2GPX;
  public hasFSA: boolean;

  // *******************************************************

  constructor(private signalk: SignalKClient) {
    this.resultSource = new Subject<number>();
    this.result$ = this.resultSource.asObservable();
    this.hasFSA = 'showOpenFilePicker' in window;
  }

  // ** delete GPX object data **
  clear() {
    this.sk2gpx = null;
  }

  // ** prepare resource data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepData(data: { [key: string]: any }) {
    const resData = {
      routes: [],
      waypoints: [],
      tracks: []
    };

    let idx = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resData.routes = data.routes.map((r: any[]) => {
      const rte = r[1];
      rte.feature.id = r[0];
      return rte;
    });
    idx = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resData.waypoints = data.waypoints.map((w: any[]) => {
      const wpt = w[1];
      wpt.feature.id = w[0];
      wpt.name = wpt.name ?? `Wpt: ${idx}`;
      idx++;
      return wpt;
    });
    resData.tracks = data.tracks;
    return resData;
  }

  // ** save selected resources to GPX file **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveToFile(res: any, selections: any) {
    this.sk2gpx = new SK2GPX();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skroutes: { [key: string]: any } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skwaypoints: { [key: string]: any } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sktracks: { [key: string]: any } = {};

    for (let i = 0; i < selections.rte.selected.length; i++) {
      if (selections.rte.selected[i]) {
        skroutes[res.routes[i].feature.id] = res.routes[i];
      }
    }
    this.sk2gpx.setRoutes(skroutes);

    for (let i = 0; i < selections.wpt.selected.length; i++) {
      if (selections.wpt.selected[i]) {
        skwaypoints[res.waypoints[i].feature.id] = res.waypoints[i];
      }
    }
    this.sk2gpx.setWaypoints(skwaypoints);

    for (let i = 0; i < selections.trk.selected.length; i++) {
      if (selections.trk.selected[i]) {
        const uuid = this.signalk.uuid;
        sktracks[uuid] = new SKTrack();
        sktracks[uuid].feature.id = uuid;
        sktracks[
          uuid
        ].feature.properties.name = `Vessel trail: ${Date().toString()}`;
        sktracks[uuid].feature.geometry.coordinates.push(res.tracks[i]);
      }
    }
    this.sk2gpx.setTracks(sktracks);

    if (this.hasFSA) {
      this.fsaSaveFile();
    } else {
      this.legacySaveToFile();
    }
  }

  // Using legacy download
  legacySaveToFile() {
    const file = new Blob([this.sk2gpx.toXML()], { type: 'text/xml' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = 'fb_export.gpx';
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
    this.resultSource.next(-1); //mimic cancelled as no result available
  }

  // Using fileSystem Access API (https)
  fsaSaveFile() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)
      .showSaveFilePicker({
        types: [
          {
            description: 'GPX file',
            accept: { 'text/xml': ['.gpx'] }
          }
        ]
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((h: any) => {
        h.createWritable()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((writable: any) => {
            const blob = new Blob([this.sk2gpx.toXML()]);
            writable.write(blob).then(() => {
              writable.close();
              this.resultSource.next(0); // ** success
            });
          })
          .catch((err: Error) => {
            // ** save error
            console.warn(err);
            this.resultSource.next(1);
          });
      })
      .catch(() => {
        // save cancelled by user
        this.resultSource.next(-1);
      });
  }
}
