import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import ImageLayer from 'ol/layer/Image';
import ImageSource from 'ol/source/Image';
import { createLoader } from 'ol/source/static';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getWidth } from 'ol/extent';
import { MapComponent } from '../map.component';
import { AppFacade } from 'src/app/app.facade';
import { LiveDepthService } from 'src/app/modules/skstream/live-depth.service';
import {
  DEFAULT_MERGE_TOLERANCE,
  DEFAULT_SAFETY_DEPTH_M,
  DEFAULT_SHADE_LIMIT_M,
  DepthSample,
  depthClusters,
  depthCss,
  selectShoals,
  shadeColor,
  SHADE_CONTOUR_LEVELS
} from 'src/app/modules/skstream/live-depth';
import {
  buildDepthField,
  DEFAULT_COVERAGE_MIN_M,
  medianConsecutiveGap,
  type DepthField
} from 'src/app/modules/skstream/bathymetry';
import { DEPTH_FRAG_SRC, DEPTH_VERT_SRC } from './live-depth-shaders';

/** Share of the viewport covered on each side beyond its edges, matching the
 * depth fetch, so a sample just off-screen still lands in the image. */
const BOX_PAD = 0.5;
/** Hard cap on a field dimension; if the cell would exceed it the cells are
 * grown to fit, so the grid always covers the whole box. */
const MAX_FIELD_CELLS = 1024;
/** Cap on the device pixel ratio the layer renders at. iPhones report 2–3;
 * capping keeps the canvas from growing without bound on high-DPR screens. */
const MAX_CANVAS_RATIO = 2;
/** Cap on a canvas backing store, in pixels. iOS Safari kills a tab that uses
 * too much canvas/GPU memory, and the padded box on a high-DPR phone would
 * otherwise allocate tens of megabytes per buffer. */
const MAX_CANVAS_PIXELS = 4_000_000;
/** Label size (CSS px): scaled with zoom between a readable floor and a cap. */
const LABEL_FONT_MIN = 12;
const LABEL_FONT_MAX = 20;
/** Smallest on-screen radius (CSS px) at which a group is labelled. */
const LABEL_MIN_RADIUS_PX = 8;

const VERT_SRC = DEPTH_VERT_SRC;
const FRAG_SRC = DEPTH_FRAG_SRC;

/** Live depth layer: renders the recorded depth as a shallow-biased raster
 * shaded from a saturated azure at the surface to white at the shade limit,
 * with fine black isobaths where the depth crosses a level. Deeper than the
 * shade limit (or with no coverage) nothing is drawn, so the chart shows
 * through.
 *
 * A CPU pass builds the depth field from the samples (see
 * `skstream/bathymetry.ts`); a WebGL2 pass samples a shade-limit colour ramp
 * and draws the contours; the result is composited onto a 2D canvas so merged
 * groups and shoals can be labelled, and that canvas is handed to the layer.
 * Panning and rotating only move the finished image — a redraw happens when the
 * data or settings change, never on `moveend`.
 */
@Component({
  selector: 'ol-map > fb-live-depth',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LiveDepthLayerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() samples: DepthSample[] = [];
  /** Grid cell size in screen pixels; also the base label size. */
  @Input() cellPx = 24;
  /** Samples at or below this depth (metres) are marked individually. */
  @Input() safetyDepthMetres = DEFAULT_SAFETY_DEPTH_M;
  /** Depth (metres) the shading runs to; deeper is left to the chart. */
  @Input() shadeLimitMetres = DEFAULT_SHADE_LIMIT_M;
  /** Depth (metres) between isobars; a contour is drawn at each multiple. */
  @Input() contourIntervalMetres = 1;
  /** Samples deeper than this (metres) are not drawn. */
  @Input() maxDepthMetres = 100;
  /** Fractional depth difference (0.15 = 15%) within which adjacent cells
   * merge into one group. */
  @Input() mergeTolerance = DEFAULT_MERGE_TOLERANCE;
  /** Signal K path the depths came from, for the display unit of the labels. */
  @Input() depthPath = 'environment.depth.belowTransducer';
  @Input() visible = true;
  @Input() opacity = 0.85;
  @Input() zIndex: number;
  /** Bumped on any LiveDepth settings change, to force a redraw. */
  @Input() revision = 0;

  private layer: ImageLayer<ImageSource>;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quad: WebGLBuffer | null = null;
  private depthTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private aPos = 0;
  private uDepth: WebGLUniformLocation | null = null;
  private uLut: WebGLUniformLocation | null = null;
  private uTexel: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;
  private uField: WebGLUniformLocation | null = null;
  private uShadeLimit: WebGLUniformLocation | null = null;
  private uLevels: WebGLUniformLocation | null = null;
  private uInterval: WebGLUniformLocation | null = null;
  private uLineWidth: WebGLUniformLocation | null = null;
  /** Two reusable 2D canvases, alternated so the one an in-flight ImageSource
   * still references is never overwritten. A fresh canvas per redraw is what
   * crashed the tab on iOS Safari. */
  private canvases: HTMLCanvasElement[] = [];
  private canvasIndex = 0;
  /** The depth field, built from the data alone and reused across views. */
  private field: DepthField | null = null;
  /** Set when the data or a field-affecting setting changed, so the field is
   * rebuilt on the next redraw rather than on every pan/zoom. */
  private fieldDirty = true;
  /** Resolution of the last redraw, so a resolution change can trigger one. */
  private lastResolution = 0;
  /** View centre of the last redraw, so a pan can trigger one. */
  private lastCenter: [number, number] | null = null;
  private zoomTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private mapComponent: MapComponent,
    private app: AppFacade,
    private liveDepth: LiveDepthService,
    changeDetectorRef: ChangeDetectorRef
  ) {
    changeDetectorRef.detach();
  }

  ngOnInit() {
    this.glCanvas = document.createElement('canvas');
    // iOS Safari reclaims WebGL contexts under memory pressure; handle loss and
    // restore so the layer recovers instead of drawing into a dead context.
    this.glCanvas.addEventListener(
      'webglcontextlost',
      this.onContextLost,
      false
    );
    this.glCanvas.addEventListener(
      'webglcontextrestored',
      this.onContextRestored,
      false
    );
    this.initWebgl();
    this.layer = new ImageLayer({
      zIndex: this.zIndex,
      visible: this.visible,
      opacity: this.clampOpacity(this.opacity)
    });
    const map = this.mapComponent.getMap();
    if (map) {
      map.addLayer(this.layer);
      map.on('moveend', this.onMoveEnd);
      this.redraw();
      map.render();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.layer) {
      return;
    }
    if (changes['visible']) {
      this.layer.setVisible(this.visible);
    }
    if (changes['opacity']) {
      this.layer.setOpacity(this.clampOpacity(this.opacity));
    }
    if (changes['zIndex']) {
      this.layer.setZIndex(this.zIndex);
    }
    if (
      changes['samples'] ||
      changes['cellPx'] ||
      changes['safetyDepthMetres'] ||
      changes['shadeLimitMetres'] ||
      changes['contourIntervalMetres'] ||
      changes['maxDepthMetres'] ||
      changes['mergeTolerance'] ||
      changes['depthPath'] ||
      changes['revision']
    ) {
      this.fieldDirty = true;
      this.redraw();
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (map && this.layer) {
      map.un('moveend', this.onMoveEnd);
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
    clearTimeout(this.zoomTimer);
    this.glCanvas?.removeEventListener('webglcontextlost', this.onContextLost);
    this.glCanvas?.removeEventListener(
      'webglcontextrestored',
      this.onContextRestored
    );
    // Release the GL resources and the context: the layer is rebuilt each time
    // the setting toggles, and browsers cap the number of live WebGL contexts.
    const gl = this.gl;
    if (gl) {
      gl.deleteTexture(this.depthTexture);
      gl.deleteTexture(this.lutTexture);
      gl.deleteBuffer(this.quad);
      gl.deleteProgram(this.program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.canvases = [];
  }

  /** Rebuild when the view changed enough to matter: a zoom (new resolution) or
   * a pan that has left the fetched area. Rotation alone does neither, so a
   * heading-up chart re-rotating does not redraw. Debounced, because a wheel or
   * pinch fires many move-ends. */
  private onMoveEnd = () => {
    const view = this.mapComponent.getMap()?.getView();
    const resolution = view?.getResolution();
    const center = view?.getCenter();
    if (!resolution || !center) {
      return;
    }
    // No redraw has completed yet — the first one can bail on a zero-size map.
    // Schedule one, so the layer draws and, in tile mode, its view bbox exists
    // for the service to fetch against.
    if (!this.lastResolution || !this.lastCenter) {
      clearTimeout(this.zoomTimer);
      this.zoomTimer = setTimeout(() => this.redraw(), 120);
      return;
    }
    const zoomed =
      Math.abs(resolution - this.lastResolution) / this.lastResolution >= 0.02;
    const panned =
      Math.hypot(
        center[0] - this.lastCenter[0],
        center[1] - this.lastCenter[1]
      ) >=
      resolution * 24;
    if (!zoomed && !panned) {
      return;
    }
    clearTimeout(this.zoomTimer);
    this.zoomTimer = setTimeout(() => this.redraw(), 120);
  };

  private clampOpacity(value: number): number {
    return Math.max(0, Math.min(1, value ?? 1));
  }

  // ******** WebGL setup ********

  private initWebgl() {
    const gl = this.glCanvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false
    }) as WebGL2RenderingContext | null;
    if (!gl) {
      console.warn('Live depth: WebGL2 not available; the layer cannot draw.');
      return;
    }
    const vs = this.compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      console.warn('Live depth: shader setup failed.');
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(
        'Live depth: shader link failed:',
        gl.getProgramInfoLog(program)
      );
      return;
    }
    this.gl = gl;
    this.program = program;
    this.aPos = gl.getAttribLocation(program, 'aPos');
    this.uDepth = gl.getUniformLocation(program, 'uDepth');
    this.uLut = gl.getUniformLocation(program, 'uLut');
    this.uTexel = gl.getUniformLocation(program, 'uTexel');
    this.uView = gl.getUniformLocation(program, 'uView');
    this.uField = gl.getUniformLocation(program, 'uField');
    this.uShadeLimit = gl.getUniformLocation(program, 'uShadeLimit');
    this.uLevels = gl.getUniformLocation(program, 'uLevels');
    this.uInterval = gl.getUniformLocation(program, 'uInterval');
    this.uLineWidth = gl.getUniformLocation(program, 'uLineWidth');

    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // NEAREST sampling; the shader interpolates by hand, so the field does not
    // depend on a filterable float texture (OES_texture_float_linear).
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // The shade ramp as a 256x1 colour lookup, built from the same stops the
    // CPU palette uses.
    this.lutTexture = gl.createTexture();
    const lut = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      const [r, g, b] = shadeColor(i / 255);
      lut[i * 4] = r;
      lut[i * 4 + 1] = g;
      lut[i * 4 + 2] = b;
      lut[i * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      lut
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private compile(
    gl: WebGL2RenderingContext,
    type: number,
    src: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(
        'Live depth: shader compile failed:',
        gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** The WebGL context was lost (iOS does this under memory pressure). Stop
   * using it — `renderGpu` is guarded on `this.gl` — and let the browser
   * restore it. */
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.gl = null;
    this.program = null;
    this.quad = null;
    this.depthTexture = null;
    this.lutTexture = null;
  };

  /** The context came back: rebuild the GL resources, re-upload the field and
   * redraw. */
  private onContextRestored = () => {
    this.initWebgl();
    if (this.field) {
      this.uploadField(this.field);
    }
    this.redraw();
    this.mapComponent.getMap()?.render();
  };

  // ******** render ********

  private redraw() {
    const map = this.mapComponent.getMap();
    if (!map || !this.layer) {
      return;
    }
    const view = map.getView();
    const size = map.getSize();
    const resolution = view.getResolution();
    if (!size || !resolution || size[0] === 0 || size[1] === 0) {
      return;
    }
    this.lastResolution = resolution;
    const center = view.getCenter();
    this.lastCenter = center ? [center[0], center[1]] : null;
    const zoom = view.getZoom() ?? 0;
    // Cap the device pixel ratio: an iPhone reports 2–3, and the padded box
    // would otherwise be rendered at several times the screen pixels.
    const ratio = Math.min(map.getPixelRatio(), MAX_CANVAS_RATIO);

    // The view extent in EPSG:3857 (may run past ±180 when panned a world
    // away), padded so the image covers a little beyond the screen.
    const viewExtent = view.calculateExtent(size);
    if (!viewExtent) {
      return;
    }
    const padX = (viewExtent[2] - viewExtent[0]) * BOX_PAD;
    const padY = (viewExtent[3] - viewExtent[1]) * BOX_PAD;
    const box: [number, number, number, number] = [
      viewExtent[0] - padX,
      viewExtent[1] - padY,
      viewExtent[2] + padX,
      viewExtent[3] + padY
    ];
    const boxW = box[2] - box[0];
    const boxH = box[3] - box[1];
    if (!(boxW > 0) || !(boxH > 0)) {
      return;
    }
    const t0 = performance.now();

    // In tile mode the service fetches the LiveDepth tiles for this view, so
    // tell it the box (lon/lat) and the field's target ground cell size.
    if (this.liveDepth.mode() === 'tiles') {
      const [west, south] = toLonLat([box[0], box[1]]);
      const [east, north] = toLonLat([box[2], box[3]]);
      this.liveDepth.setView(
        [west, south, east, north],
        Math.max(boxW, boxH) / MAX_FIELD_CELLS
      );
    }

    const projection = view.getProjection();
    const projExtent = projection.getExtent();
    const worldWidth = projExtent
      ? getWidth(projExtent)
      : 2 * 20037508.342789244;

    // Rebuild the field only when the data or a setting changed; panning and
    // zooming reuse it, so the surface (and the absolute-depth isobars) does
    // not move as the view changes.
    if (this.fieldDirty) {
      this.buildField();
      this.fieldDirty = false;
    }
    const tBuild = performance.now();

    let canvasW = Math.max(1, Math.round((boxW / resolution) * ratio));
    let canvasH = Math.max(1, Math.round((boxH / resolution) * ratio));
    // Bound the backing store: a padded, high-DPR view would otherwise
    // allocate tens of megabytes per buffer (and iOS kills the tab for it).
    const pixels = canvasW * canvasH;
    if (pixels > MAX_CANVAS_PIXELS) {
      const scale = Math.sqrt(MAX_CANVAS_PIXELS / pixels);
      canvasW = Math.max(1, Math.round(canvasW * scale));
      canvasH = Math.max(1, Math.round(canvasH * scale));
    }
    // The scale the drawing is actually rendered at, after the ratio cap and
    // the pixel cap — used to size lines, dots and labels consistently.
    const drawRatio = canvasW / (boxW / resolution);

    // Reuse one of two canvases, alternating so the previous ImageSource (still
    // showing the last frame) is not overwritten — the jump a single reused
    // canvas would cause. Allocating a fresh canvas per redraw is what crashed
    // the tab on iOS Safari.
    const { canvas: out, ctx } = this.nextCanvas(canvasW, canvasH);
    if (!ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (
      this.field &&
      this.gl &&
      this.program &&
      this.depthTexture &&
      this.lutTexture &&
      this.quad
    ) {
      this.renderGpu(box, canvasW, canvasH, drawRatio, worldWidth);
      ctx.drawImage(this.glCanvas, 0, 0);
    }
    const tRender = performance.now();

    this.drawOverlay(ctx, box, canvasW, canvasH, resolution, drawRatio, zoom);
    const tOverlay = performance.now();
    if (tOverlay - t0 > 40) {
      console.warn(
        `LiveDepth redraw ${(tOverlay - t0).toFixed(0)}ms ` +
          `(build ${(tBuild - t0).toFixed(0)}, render ${(tRender - tBuild).toFixed(0)}, ` +
          `overlay ${(tOverlay - tRender).toFixed(0)}) ` +
          `canvas ${canvasW}x${canvasH} samples ${this.samples.length} ` +
          `field ${this.field ? `${this.field.width}x${this.field.height}` : 'none'}`
      );
    }

    this.layer.setSource(
      new ImageSource({
        projection,
        loader: createLoader({
          imageExtent: box,
          url: '',
          load: () => Promise.resolve(out)
        })
      })
    );
  }

  /** The next of two reusable canvases, sized ready to draw into. The other is
   * left intact for the ImageSource still displaying it. */
  private nextCanvas(
    width: number,
    height: number
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
    if (this.canvases.length < 2) {
      this.canvases = [
        document.createElement('canvas'),
        document.createElement('canvas')
      ];
      this.canvasIndex = 0;
    }
    this.canvasIndex = (this.canvasIndex + 1) % 2;
    const canvas = this.canvases[this.canvasIndex];
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { canvas, ctx: canvas.getContext('2d') };
  }

  /** Build the depth field from the data alone (fixed ground resolution over
   * the data's extent), so it is independent of the current view. */
  private buildField() {
    this.field = null;
    if (this.samples.length === 0) {
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of this.samples) {
      const x = fromLonLat([s.lon, s.lat])[0];
      const y = fromLonLat([s.lon, s.lat])[1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const padX = (maxX - minX) * 0.1 + 1;
    const padY = (maxY - minY) * 0.1 + 1;
    const extent: [number, number, number, number] = [
      minX - padX,
      minY - padY,
      maxX + padX,
      maxY + padY
    ];
    const extMax = Math.max(extent[2] - extent[0], extent[3] - extent[1]);
    // Tile samples are already gridded, not along-track ordered, so a
    // consecutive-gap estimate is meaningless; the target cell size below is
    // the field resolution instead.
    const tiles = this.liveDepth.mode() === 'tiles';
    const gap = tiles ? 0 : medianConsecutiveGap(this.samples);
    // The history source's along-track samples need a coverage floor to bridge
    // the gaps between fixes; tile samples sit at the tile cell spacing (≤ the
    // field cell) and only need to reach their neighbours. Keep the floor to
    // no more than ~8 cells of the grid, so a fine cell (an anchored vessel's
    // sub-metre cluster) can't splat every sample across the 64-cell cap.
    const minCover = tiles ? 0 : DEFAULT_COVERAGE_MIN_M;
    const cell = Math.max(gap, extMax / MAX_FIELD_CELLS, minCover / 8, 0.01);
    const field = buildDepthField(this.samples, extent, {
      cellMetres: cell,
      coverageMetres: Math.max(cell * 1.5, gap * 1.5),
      coverageMinMetres: minCover
    });
    if (!field) {
      return;
    }
    this.field = field;
    this.uploadField(field);
  }

  private uploadField(field: {
    width: number;
    height: number;
    depth: Float32Array;
  }) {
    const gl = this.gl;
    if (!gl || !this.depthTexture) {
      return;
    }
    // GLSL ES does not require NaN support (nor NaN comparisons), so the
    // no-coverage marker the field uses on the CPU is uploaded as -1 — a value
    // no real depth can take — and the shader tests `v < 0` for it.
    const gpu = new Float32Array(field.depth.length);
    for (let i = 0; i < field.depth.length; i++) {
      const d = field.depth[i];
      gpu[i] = Number.isNaN(d) ? -1 : d;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      field.width,
      field.height,
      0,
      gl.RED,
      gl.FLOAT,
      gpu
    );
  }

  private renderGpu(
    box: [number, number, number, number],
    canvasW: number,
    canvasH: number,
    ratio: number,
    worldWidth: number
  ) {
    const gl = this.gl;
    const field = this.field;
    if (!gl || !field) {
      return;
    }
    // Only resize when it actually changed — assigning width/height resets the
    // drawing buffer, which is expensive on iOS.
    if (this.glCanvas.width !== canvasW || this.glCanvas.height !== canvasH) {
      this.glCanvas.width = canvasW;
      this.glCanvas.height = canvasH;
    }

    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);

    // The field lives in the data's world copy; shift the view into it so the
    // transform lines up even when the chart is panned a world away.
    const f = field.extent;
    const fieldCentreX = (f[0] + f[2]) / 2;
    const viewCentreX = (box[0] + box[2]) / 2;
    const shift =
      Math.round((fieldCentreX - viewCentreX) / worldWidth) * worldWidth;
    // Pass field-relative metres to the shader: absolute EPSG:3857 values
    // (~8.6e6) lose about a metre of precision in the shader's float32 maths,
    // which stair-steps a fine cell. Subtracting the field origin here, in
    // JavaScript doubles, keeps the shader working with small numbers.
    gl.uniform4f(
      this.uView,
      box[0] + shift - f[0],
      box[1] - f[1],
      box[2] - box[0],
      box[3] - box[1]
    );
    gl.uniform4f(this.uField, 0, 0, f[2] - f[0], f[3] - f[1]);
    gl.uniform2f(this.uTexel, 1 / field.width, 1 / field.height);
    gl.uniform1i(this.uDepth, 0);
    gl.uniform1i(this.uLut, 1);
    gl.uniform1f(this.uShadeLimit, Math.max(0.01, this.shadeLimitMetres));
    gl.uniform1i(this.uLevels, SHADE_CONTOUR_LEVELS);
    gl.uniform1f(this.uInterval, Math.max(0.01, this.contourIntervalMetres));
    gl.uniform1f(this.uLineWidth, Math.max(1, ratio));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    extent: [number, number, number, number],
    canvasW: number,
    canvasH: number,
    resolution: number,
    ratio: number,
    zoom: number
  ) {
    const boxW = extent[2] - extent[0];
    const boxH = extent[3] - extent[1];
    const worldWidth = 2 * 20037508.342789244;
    const centreX = (extent[0] + extent[2]) / 2;
    const toPixel = (lon: number, lat: number): [number, number] => {
      const merc = fromLonLat([lon, lat]);
      const x =
        merc[0] + Math.round((centreX - merc[0]) / worldWidth) * worldWidth;
      return [
        ((x - extent[0]) / boxW) * canvasW,
        ((extent[3] - merc[1]) / boxH) * canvasH
      ];
    };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dot = (p: [number, number], depth: number) => {
      ctx.beginPath();
      ctx.arc(
        p[0],
        p[1],
        Math.max(1.5, this.cellPx * 0.12) * ratio,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = depthCss(depth, this.shadeLimitMetres, 0.95);
      ctx.fill();
    };
    const label = (text: string, p: [number, number], fontCss: number) => {
      ctx.font = `${Math.round(fontCss * ratio)}px Roboto, Arial, sans-serif`;
      ctx.lineWidth = Math.max(2, 2 * ratio);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(text, p[0], p[1]);
      ctx.fillStyle = 'rgba(0,0,0,0.95)';
      ctx.fillText(text, p[0], p[1]);
    };

    // Mark the exact shallows without outlining anything.
    selectShoals(this.samples, this.safetyDepthMetres).forEach((s) =>
      dot(toPixel(s.lon, s.lat), s.depth)
    );

    // A dot and its depth at the centre of each merged group; no border.
    const cellSize = Math.max(1, this.cellPx * resolution);
    const clusters = depthClusters(
      this.samples,
      cellSize,
      this.mergeTolerance,
      this.maxDepthMetres
    );
    for (const c of clusters) {
      const p = toPixel(c.lon, c.lat);
      dot(p, c.depth);
      const rCss = Math.min(
        this.cellPx * 3,
        Math.max(this.cellPx * 0.3, c.radiusMetres / resolution)
      );
      if (rCss >= LABEL_MIN_RADIUS_PX) {
        label(
          this.app.formatValueForDisplay(c.depth, 'm', {
            path: this.depthPath,
            category: 'depth',
            precision: 0,
            noSymbol: true
          }),
          p,
          this.labelFontCss(zoom, rCss)
        );
      }
    }
  }

  /** Label size in CSS px: grows with zoom above a readable floor, so it never
   * shrinks to an unreadable size the way a radius-proportional size does for
   * the single-cell groups that appear when zoomed in. */
  private labelFontCss(zoom: number, radiusCss: number): number {
    const byZoom = LABEL_FONT_MIN - 1 + Math.max(0, zoom - 12) * 0.7;
    return Math.min(
      LABEL_FONT_MAX,
      Math.max(LABEL_FONT_MIN, byZoom, radiusCss * 0.5)
    );
  }
}
