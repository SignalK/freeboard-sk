import { inject, Injectable } from '@angular/core';
import ImageSource from 'ol/source/Image';
import Projection from 'ol/proj/Projection';
import { circular } from 'ol/geom/Polygon';
import { createLoader } from 'ol/source/static';
import { Coordinate } from 'ol/coordinate';
import { createEmpty } from 'ol/extent';
import {
  RadarAPIService,
  SKRadarLegendEntry
} from 'src/app/modules/radar/radar-api.service';
import { ShipState } from './ship-state.model';
import { Observable, Subscription } from 'rxjs';
import { AppFacade } from 'src/app/app.facade';

// Radar Definition for rendering
export interface RadarRenderDef {
  id: string;
  name: string;
  spokesPerRevolution: number;
  maxSpokeLen: number;
  streamUrl: string;
  legend: Record<string, SKRadarLegendEntry>;
}

@Injectable({
  providedIn: 'root'
})
export class RadarRenderService {
  public hasWebgl: boolean = false;
  private worker: Worker;

  private app = inject(AppFacade);
  private radarApi = inject(RadarAPIService);

  private shipStateSubscription: Subscription;

  constructor() {
    const gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    if (gl !== null) {
      this.hasWebgl = true;
      this.app.debug('Radar using WebGL renderer');
    }
  }

  public async connect(): Promise<RadarRenderDef> {
    if (!this.hasWebgl) {
      this.app.showMessage('Web-GL is not available!');
      return;
    }
    if (!this.radarApi.radar()) {
      this.app.showMessage('No Radar speciified!');
      return;
    }
    // map legend for rendering
    const legend = {};
    let idx = 0;
    this.radarApi.radar().capabilities?.legend?.pixels?.forEach((i) => {
      legend[idx] = i;
      idx++;
    });

    return {
      id: this.radarApi.radar().device.id,
      name: this.radarApi.radar().device.name,
      // Spoke geometry comes from /capabilities (present on both old and new
      // servers). Radar API 3.4.0 streams binary spokes from …/{id}/spokes;
      // pre-3.4.0 servers (no version in the discovery envelope) use …/{id}/stream.
      spokesPerRevolution:
        this.radarApi.radar().capabilities.spokesPerRevolution,
      maxSpokeLen: this.radarApi.radar().capabilities.maxSpokeLength,
      streamUrl: `${this.app.hostDef.ssl ? 'wss' : 'ws'}://${this.app.hostDef.name}:${
        this.app.hostDef.port
      }/signalk/v2/api/vessels/self/radars/${this.radarApi.radarId()}/${
        this.radarApi.apiVersion() ? 'spokes' : 'stream'
      }`,
      legend: legend
    };
  }

  public async disconnect() {
    this.shipStateSubscription?.unsubscribe();
    this.worker?.terminate();
    this.worker = undefined;
    this.app.showMessage(`Radar connection closed`);
  }

  public createRadarSource(
    radar: RadarRenderDef,
    shipState: Observable<ShipState>
  ): ImageSource {
    let range = 0;
    let location: Coordinate = [0, 0];
    let rangeExtent = createEmpty();

    const updateExtent = (location: Coordinate, range: number) => {
      const radius = range > 0 ? range : 25465; // fallback for initial render
      let extent = circular(location, radius)
        .transform('EPSG:4326', 'EPSG:3857')
        .getExtent();
      rangeExtent[0] = extent[0];
      rangeExtent[1] = extent[1];
      rangeExtent[2] = extent[2];
      rangeExtent[3] = extent[3];
    };

    updateExtent(location, range);

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

    if (this.hasWebgl) {
      this.worker = new Worker(new URL('./radar-gl.worker', import.meta.url));
    }

    this.worker.postMessage({ canvas: offscreenRadarCanvas, radar: radar }, [
      offscreenRadarCanvas
    ]);

    let lastRedraw = 0;
    const REDRAW_INTERVAL_MS = 33;

    this.worker.onmessage = (event) => {
      if (event.data.redraw) {
        const now = Date.now();
        if (now - lastRedraw >= REDRAW_INTERVAL_MS) {
          radarSource.refresh();
          lastRedraw = now;
        }
      } else if (event.data.range) {
        range = event.data.range;
        updateExtent(location, range);
        radarSource.refresh();
      }
      if (event.data.msg) {
        this.app.showMessage(event.data.msg);
      }
    };

    let lastHeading: number;

    this.shipStateSubscription = shipState.subscribe((state) => {
      const locationChanged =
        state.location[0] !== location[0] || state.location[1] !== location[1];

      location = state.location;

      if (locationChanged) {
        updateExtent(location, range);
        radarSource.refresh();
      }
      if (
        lastHeading === undefined ||
        Math.abs(state.heading - lastHeading) > 0.5
      ) {
        this.worker.postMessage({
          heading: state.heading
        });
        lastHeading = state.heading;
      }
    });
    return radarSource;
  }
}
