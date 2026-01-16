import { inject, Injectable } from '@angular/core';
import ImageSource from 'ol/source/Image';
import Projection from 'ol/proj/Projection';
import { circular } from 'ol/geom/Polygon';
import { createLoader } from 'ol/source/static';
import { Coordinate } from 'ol/coordinate';
import { createEmpty } from 'ol/extent';
import {
  RadarAPIService,
  SKRadar
} from 'src/app/modules/radar/radar-api.service';
import { ShipState } from './ship-state.model';
import { Observable } from 'rxjs';
import { AppFacade } from 'src/app/app.facade';
import { legend } from './legend';

@Injectable({
  providedIn: 'root'
})
export class RadarRenderService {
  public hasWebgl: boolean = false;

  private radars: Map<string, SKRadar> = new Map<string, SKRadar>();
  private workers: Worker[] = [];

  private app = inject(AppFacade);
  private radarApi = inject(RadarAPIService);

  constructor() {
    const gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    if (gl !== null) {
      this.hasWebgl = true;
      this.app.debug('Radar using WebGL renderer');
    }
  }

  public async connect() {
    //this.radars = await firstValueFrom(this.signalk.get("/plugins/radar-sk/v1/api/radars")
    // .pipe(map((re) => new Map<string, SKRadar>(Object.entries(re)))));

    // SK Radar API
    const state = await this.radarApi.getState(this.radarApi.defaultRadar());
    const r = await this.radarApi.getRadar(this.radarApi.defaultRadar());
    this.radars.set(r.id, {
      id: r.id,
      name: r.name,
      spokes: r.spokesPerRevolution,
      maxSpokeLen: r.maxSpokeLen,
      streamUrl:
        state.streamUrl ??
        `${this.app.hostDef.ssl ? 'wss' : 'ws'}://${this.app.hostDef.name}:${
          this.app.hostDef.port
        }/signalk/v2/api/vessels/self/radars/${state.id}/stream`,
      legend: legend
    });
  }

  public async disconnect() {
    this.workers.forEach((w) => {
      w.terminate();
    });
    this.workers = [];
  }

  public getRadars(): Map<string, SKRadar> {
    return this.radars;
  }

  public createRadarSource(
    radar: SKRadar,
    shipState: Observable<ShipState>
  ): ImageSource {
    let range = 0;
    let location: Coordinate = [0, 0];
    let rangeExtent = createEmpty();

    function UpdateExtent(location: Coordinate, range: number) {
      let extent = circular(location, 25465)
        .transform('EPSG:4326', 'EPSG:3857')
        .getExtent();
      rangeExtent[0] = extent[0];
      rangeExtent[1] = extent[1];
      rangeExtent[2] = extent[2];
      rangeExtent[3] = extent[3];
    }

    UpdateExtent(location, range);

    const projection = new Projection({
      code: 'EPSG:3857', //'radar',
      units: 'degrees' //'m'
    });

    const radarCanvas = document.createElement('canvas');
    radarCanvas.width = 2 * radar.maxSpokeLen;
    radarCanvas.height = 2 * radar.maxSpokeLen;

    const offscreenRadarCanvas = radarCanvas.transferControlToOffscreen();

    let radarSource = new ImageSource({
      projection: projection,
      loader: createLoader({
        imageExtent: rangeExtent,
        url: '',
        load: () => {
          return Promise.resolve(radarCanvas);
        }
      })
    });

    var worker: Worker;
    if (this.hasWebgl) {
      worker = new Worker(new URL('./radar-gl.worker', import.meta.url));
    } else {
      worker = new Worker(new URL('./radar.worker', import.meta.url));
    }

    this.workers.push(worker);
    worker.postMessage({ canvas: offscreenRadarCanvas, radar: radar }, [
      offscreenRadarCanvas
    ]);
    worker.onmessage = (event) => {
      if (event.data.redraw) {
        radarSource.refresh();
      } else if (event.data.range) {
        range = event.data.range;
        UpdateExtent(location, range);
        radarSource.refresh();
      }
    };
    shipState.subscribe((state) => {
      location = state.location;
      UpdateExtent(location, range);
      worker.postMessage({ heading: state.heading });
      radarSource.refresh();
    });
    return radarSource;
  }
}
