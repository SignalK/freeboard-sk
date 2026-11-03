import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import Layer from 'ol/layer/Layer';
import { Control } from 'ol/control';
import { FrameState } from 'ol/Map';
import { Transform } from 'ol/transform';
import {
  Subject,
  Subscription,
  debounceTime,
  filter,
  interval,
  map as rxMap,
  merge,
  switchMap
} from 'rxjs';

import { AppFacade } from 'src/app/app.facade';
import { Convert, TARGET_UNIT } from 'src/app/lib/convert';
import { WeatherService } from 'src/app/modules/weather/weather.service';
import {
  mercatorXToLon,
  mercatorYToLat,
  WindField,
  WindGrid,
  windColor,
  windGridFor,
  windGridNodes,
  WIND_COLOR_MAX,
  WIND_COLOR_STOPS
} from 'src/app/modules/weather/wind-field';
import { MapComponent } from '../map.component';
import {
  COLOR_BANDS,
  colorBand,
  colorBandColors,
  FlowView,
  particleCountFor,
  TRAIL_POINTS,
  WindParticles
} from './wind-particles';

/**
 * Its own class rather than a plain `Layer` with a `render` function: the
 * split view mirrors plain element layers by rendering them again with the
 * second pane's frame, and this layer's animation follows a single view.
 */
class WindFlowLayer extends Layer {}

/** Shading is computed on a grid this many CSS px apart, then smoothed up. */
const SHADE_CELL = 6;
const SHADE_ALPHA = 150;
/** Opacity of the particles at the head of a trail. */
const TRAIL_ALPHA = 0.9;
/** Cached grid nodes are reused, so this mostly keeps "current" current. */
const REFRESH_MS = 10 * 60 * 1000;

interface LegendTick {
  pct: number;
  label: string;
}

@Component({
  selector: 'ol-map > fb-wind-flow',
  template: `
    <div #legend class="fb-wind-legend">
      <div class="head">
        <span class="title">Wind</span>
        <span class="unit">{{ unit() }}</span>
        <span class="source">{{ caption() }}</span>
      </div>
      <div class="bar" [style.background]="gradient"></div>
      <div class="ticks">
        @for (t of ticks(); track t.pct) {
          <span [style.left.%]="t.pct">{{ t.label }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .fb-wind-legend {
      position: absolute;
      left: 10px;
      bottom: 36px;
      width: 240px;
      padding: 6px 10px 16px;
      border-radius: 10px;
      background: rgba(14, 22, 33, 0.72);
      backdrop-filter: blur(6px);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      color: #f2f5f8;
      font:
        11px Roboto,
        Arial,
        sans-serif;
      pointer-events: none;
      user-select: none;
    }
    .head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 5px;
    }
    .title {
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .unit {
      opacity: 0.8;
    }
    .source {
      margin-left: auto;
      font-size: 10px;
      opacity: 0.6;
    }
    .bar {
      height: 7px;
      border-radius: 4px;
    }
    .ticks {
      position: relative;
    }
    .ticks span {
      position: absolute;
      top: 2px;
      transform: translateX(-50%);
      font-size: 10px;
      opacity: 0.85;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class WindFlowLayerComponent implements OnDestroy {
  readonly show = input(false);
  /** Shade the map by wind speed, with white particles over it; without
   *  shading the particles carry the speed colours themselves. */
  readonly shading = input(true);
  readonly opacity = input(1);
  /** The speed unit setting, so the legend follows it. */
  readonly speedUnit = input<string>('kn');

  private readonly mapComponent = inject(MapComponent);
  private readonly weather = inject(WeatherService);
  private readonly app = inject(AppFacade);
  private readonly zone = inject(NgZone);

  private readonly legendRef = viewChild<ElementRef<HTMLElement>>('legend');
  private readonly dataTime = signal<number | undefined>(undefined);

  protected readonly gradient = `linear-gradient(to right, ${WIND_COLOR_STOPS.map(
    ([speed, [r, g, b]]) =>
      `rgb(${r}, ${g}, ${b}) ${((speed / WIND_COLOR_MAX) * 100).toFixed(1)}%`
  ).join(', ')})`;

  protected readonly unit = computed(() => {
    this.speedUnit();
    return untracked(() => {
      const options = { precision: 0 };
      const value = this.app.formatValueForDisplay(0, 'm/s', options);
      const bare = this.app.formatValueForDisplay(0, 'm/s', {
        ...options,
        noSymbol: true
      });
      return value.slice(bare.length);
    });
  });

  protected readonly ticks = computed(() => {
    this.speedUnit();
    return untracked(() => this.legendTicks());
  });

  protected readonly caption = computed(() => {
    const time = this.dataTime();
    return time === undefined
      ? 'Open-Meteo'
      : `Open-Meteo · ${new Date(time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
  });

  private layer?: WindFlowLayer;
  private control?: Control;
  private readonly container = document.createElement('div');
  private readonly shadeCanvas = document.createElement('canvas');
  private readonly trailCanvas = document.createElement('canvas');
  private readonly shadeCell = document.createElement('canvas');

  private field?: WindField;
  private fieldKey = '';
  private readonly particles = new WindParticles();
  private view?: FlowView & { pixelRatio: number };
  private shadeDirty = true;
  private raf = 0;
  private lastFrame = 0;

  private readonly refresh$ = new Subject<boolean>();
  private refreshSub?: Subscription;

  private readonly bandColors = colorBandColors();
  private readonly segments: number[][] = Array.from(
    { length: TRAIL_POINTS * COLOR_BANDS },
    () => []
  );
  private readonly shadeLut = this.buildShadeLut();
  private readonly wind = [0, 0];

  constructor() {
    for (const canvas of [this.shadeCanvas, this.trailCanvas]) {
      canvas.style.cssText =
        'position: absolute; left: 0; top: 0; width: 100%; height: 100%;';
      this.container.appendChild(canvas);
    }
    this.container.style.cssText =
      'position: absolute; inset: 0; pointer-events: none;';

    effect(() => {
      const show = this.show();
      const legend = this.legendRef()?.nativeElement;
      untracked(() => (show ? this.addLayer(legend) : this.removeLayer()));
    });
    effect(() => {
      this.shading();
      this.container.style.opacity = String(
        Math.max(0, Math.min(1, this.opacity()))
      );
      this.shadeDirty = true;
      untracked(() => this.layer?.changed());
    });
  }

  ngOnDestroy() {
    this.removeLayer();
  }

  private addLayer(legend?: HTMLElement) {
    const map = this.mapComponent.getMap();
    if (!map) {
      return;
    }
    if (legend && !this.control) {
      this.control = new Control({ element: legend });
      map.addControl(this.control);
    }
    if (this.layer) {
      return;
    }
    this.layer = new WindFlowLayer({
      render: (frameState: FrameState) => this.render(frameState),
      zIndex: 54
    });
    this.layer.set('id', 'openmeteo-wind-flow');
    this.layer.set('name', 'Open-Meteo Wind Flow');
    map.addLayer(this.layer);

    this.refreshSub = merge(
      this.refresh$.pipe(debounceTime(250)),
      interval(REFRESH_MS).pipe(rxMap(() => true))
    )
      .pipe(
        rxMap((force) => ({ force, grid: this.currentGrid() })),
        filter(
          ({ force, grid }) =>
            !!grid && (force || gridKey(grid) !== this.fieldKey)
        ),
        switchMap(({ grid }) => {
          const g = grid as WindGrid;
          return this.weather
            .getWindGrid(windGridNodes(g))
            .pipe(rxMap((result) => ({ grid: g, result })));
        })
      )
      .subscribe(({ grid, result }) => {
        // A failed fetch leaves the previous field in place: it still covers
        // most of the view after a pan.
        if (!result.values.some((v) => v)) {
          return;
        }
        this.field = new WindField(grid, result.values);
        this.fieldKey = gridKey(grid);
        this.shadeDirty = true;
        this.dataTime.set(result.time);
        this.layer?.changed();
      });
    map.on('moveend', this.onMoveEnd);
    this.refresh$.next(true);

    this.zone.runOutsideAngular(() => {
      this.lastFrame = 0;
      this.raf = requestAnimationFrame(this.frame);
    });
  }

  private removeLayer() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.refreshSub?.unsubscribe();
    this.refreshSub = undefined;
    const map = this.mapComponent.getMap();
    map?.un('moveend', this.onMoveEnd);
    if (this.control) {
      map?.removeControl(this.control);
      this.control = undefined;
    }
    if (this.layer) {
      map?.removeLayer(this.layer);
      this.layer = undefined;
    }
    this.view = undefined;
  }

  private onMoveEnd = () => this.refresh$.next(false);

  private currentGrid(): WindGrid | null {
    const map = this.mapComponent.getMap();
    const size = map?.getSize();
    return map && size
      ? windGridFor(map.getView().calculateExtent(size))
      : null;
  }

  /** Called by OpenLayers whenever the map is drawn: tracks the view and
   *  redraws the shading. The particles move on their own frames. */
  private render(frameState: FrameState): HTMLElement {
    const [width, height] = frameState.size;
    const pixelRatio = frameState.pixelRatio;
    const previous = this.view;
    const resized =
      !previous ||
      previous.width !== width ||
      previous.height !== height ||
      previous.pixelRatio !== pixelRatio;
    const moved =
      !previous ||
      !sameTransform(
        previous.coordinateToPixel,
        frameState.coordinateToPixelTransform
      );

    this.view = {
      width,
      height,
      pixelRatio,
      coordinateToPixel:
        frameState.coordinateToPixelTransform.slice() as Transform,
      pixelToCoordinate:
        frameState.pixelToCoordinateTransform.slice() as Transform,
      resolution: frameState.viewState.resolution
    };

    if (resized) {
      for (const canvas of [this.shadeCanvas, this.trailCanvas]) {
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
      }
      this.particles.reset(particleCountFor(width, height), this.view);
    } else if (previous && previous.resolution !== this.view.resolution) {
      this.particles.zoomed(previous, this.view);
    }
    if (resized || moved || this.shadeDirty) {
      this.drawShading();
    }
    return this.container;
  }

  private frame = (time: number) => {
    this.raf = requestAnimationFrame(this.frame);
    // Hidden tabs get no frames; don't let the first one back jump ahead.
    const dt = this.lastFrame
      ? Math.min(0.1, (time - this.lastFrame) / 1000)
      : 0;
    this.lastFrame = time;
    const view = this.view;
    const field = this.field;
    if (!view || !field) {
      return;
    }
    this.particles.step(dt, (x, y, out) => field.sampleAt(x, y, out), view);
    this.drawParticles(view);
  };

  private drawParticles(view: FlowView & { pixelRatio: number }) {
    const ctx = this.trailCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const shaded = this.shading();
    const t = view.coordinateToPixel;
    const speed = this.particles.speed;
    for (const s of this.segments) {
      s.length = 0;
    }
    this.particles.forEachSegment((i, level, x0, y0, x1, y1) => {
      const band = shaded ? 0 : colorBand(speed[i]);
      this.segments[band * TRAIL_POINTS + level].push(
        t[0] * x0 + t[2] * y0 + t[4],
        t[1] * x0 + t[3] * y0 + t[5],
        t[0] * x1 + t[2] * y1 + t[4],
        t[1] * x1 + t[3] * y1 + t[5]
      );
    });

    const pr = view.pixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    ctx.lineWidth = shaded ? 1.1 : 1.4;
    ctx.lineCap = 'round';
    for (let band = 0; band < COLOR_BANDS; band++) {
      const [r, g, b] = shaded ? [255, 255, 255] : this.bandColors[band];
      for (let level = 0; level < TRAIL_POINTS; level++) {
        const s = this.segments[band * TRAIL_POINTS + level];
        if (s.length === 0) {
          continue;
        }
        const alpha = (TRAIL_ALPHA * (level + 1)) / TRAIL_POINTS;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let k = 0; k < s.length; k += 4) {
          ctx.moveTo(s[k], s[k + 1]);
          ctx.lineTo(s[k + 2], s[k + 3]);
        }
        ctx.stroke();
      }
    }
  }

  /** Shades the view by wind speed: sampled on a coarse grid, then scaled
   *  up with smoothing, which is cheap enough to redo on every frame of a
   *  pan and looks the same as sampling every pixel. */
  private drawShading() {
    this.shadeDirty = false;
    const view = this.view;
    const ctx = this.shadeCanvas.getContext('2d');
    if (!view || !ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.shadeCanvas.width, this.shadeCanvas.height);
    const field = this.field;
    if (!field || !this.shading()) {
      return;
    }

    const cols = Math.ceil(view.width / SHADE_CELL) + 1;
    const rows = Math.ceil(view.height / SHADE_CELL) + 1;
    this.shadeCell.width = cols;
    this.shadeCell.height = rows;
    const cellCtx = this.shadeCell.getContext('2d');
    if (!cellCtx) {
      return;
    }
    const image = cellCtx.createImageData(cols, rows);
    const data = image.data;
    const t = view.pixelToCoordinate;
    const lutMax = this.shadeLut.length / 3 - 1;
    for (let row = 0; row < rows; row++) {
      const py = row * SHADE_CELL;
      for (let col = 0; col < cols; col++) {
        const px = col * SHADE_CELL;
        const x = t[0] * px + t[2] * py + t[4];
        const y = t[1] * px + t[3] * py + t[5];
        if (!field.sample(mercatorXToLon(x), mercatorYToLat(y), this.wind)) {
          continue;
        }
        const speed = Math.hypot(this.wind[0], this.wind[1]);
        const k =
          Math.min(lutMax, Math.round((speed / WIND_COLOR_MAX) * lutMax)) * 3;
        const o = (row * cols + col) * 4;
        data[o] = this.shadeLut[k];
        data[o + 1] = this.shadeLut[k + 1];
        data[o + 2] = this.shadeLut[k + 2];
        data[o + 3] = SHADE_ALPHA;
      }
    }
    cellCtx.putImageData(image, 0, 0);
    const pr = view.pixelRatio;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Each sample sits on a cell corner, not its centre: shift by half a cell.
    ctx.drawImage(
      this.shadeCell,
      (-SHADE_CELL / 2) * pr,
      (-SHADE_CELL / 2) * pr,
      cols * SHADE_CELL * pr,
      rows * SHADE_CELL * pr
    );
  }

  private buildShadeLut() {
    const steps = 256;
    const lut = new Uint8ClampedArray(steps * 3);
    const rgb = [0, 0, 0];
    for (let i = 0; i < steps; i++) {
      windColor((i / (steps - 1)) * WIND_COLOR_MAX, rgb);
      lut.set(rgb, i * 3);
    }
    return lut;
  }

  /** Round values in the display unit along the colour bar. The unit may not
   *  be linear (Beaufort), so each tick's m/s is found by bisection. */
  private legendTicks(): LegendTick[] {
    const unit = this.speedUnit() as TARGET_UNIT;
    const toUnit = (ms: number) => Convert.transform(ms, 'm/s', unit) ?? ms;
    const top = toUnit(WIND_COLOR_MAX);
    const step =
      [1, 2, 5, 10, 20, 25, 50, 100].find((s) => top / s <= 6) ?? 100;
    const ticks: LegendTick[] = [];
    for (let value = 0; value <= top; value += step) {
      let lo = 0;
      let hi = WIND_COLOR_MAX;
      for (let n = 0; n < 30; n++) {
        const mid = (lo + hi) / 2;
        if (toUnit(mid) < value) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      ticks.push({
        pct: (hi / WIND_COLOR_MAX) * 100,
        label: this.app.formatValueForDisplay(hi, 'm/s', {
          precision: 0,
          noSymbol: true
        })
      });
    }
    return ticks;
  }
}

function gridKey(grid: WindGrid) {
  return `${grid.lon0},${grid.lat0},${grid.step},${grid.cols},${grid.rows}`;
}

function sameTransform(a: Transform, b: Transform) {
  for (let i = 0; i < 6; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
