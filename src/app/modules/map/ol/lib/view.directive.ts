import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import View from 'ol/View';
import type { Coordinate as MercatorCoordinate } from 'ol/coordinate';
import { easeOut, linear } from 'ol/easing';
import { getWidth } from 'ol/extent';
import { transformExtent, toLonLat, fromLonLat } from 'ol/proj';
import { Coordinate, Extent } from './models';
import { MapComponent } from './map.component';
import { ProjectionLike } from 'ol/proj';
import { worldCopyOffset } from './util';

const animateDuration = 500;

const ZOOM_ANIMATION_MS = 250;
const MOVE_ANIMATION_MS = 500;
// Changes closer together than this are one moving view (following the
// vessel): each glides for most of the time until the next arrives, so the
// chart moves continuously. The rest of the interval lets the view come to
// rest, which is when OpenLayers fires the moveend that refreshes what
// depends on the map extent.
const FOLLOW_MAX_INTERVAL_MS = 1500;
const FOLLOW_DURATION_SHARE = 0.9;
// Changes closer together than this are parts of one move (the centre and
// the rotation of one vessel update arriving apart) and finish together.
const SAME_MOVE_MS = 200;
const MIN_ANIMATION_MS = 100;
// Mercator metres; smaller centre changes are not a move.
const CENTER_EPSILON = 0.01;

interface ViewTarget {
  center?: MercatorCoordinate;
  zoom?: number;
  rotation?: number;
}

@Directive({
  selector: 'ol-map > [olView]',
  standalone: false
})
export class ViewDirective
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timerCenterId: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timerZoomId: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timerRotationId: any;
  private view?: View;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private viewProperties: { [index: string]: any } = {};
  // What the running animation is heading for, so a change to one property
  // keeps the others on their way.
  private pending: ViewTarget = {};
  private animationId = 0;
  private lastMoveAt = -Infinity;
  private animationEndsAt = 0;
  private easing = easeOut;

  @Output() centerChange: EventEmitter<Coordinate> =
    new EventEmitter<Coordinate>();
  @Output() rotationChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() zoomChange: EventEmitter<number> = new EventEmitter<number>();

  @Input() enableAnimation = false;
  @Input() constrainRotation?: boolean | number;
  @Input() constrainResolution?: boolean;
  @Input() enableRotation?: boolean;
  @Input() extent?: Extent;
  @Input() maxResolution?: number;
  @Input() minResolution?: number;
  @Input() maxZoom?: number;
  @Input() minZoom?: number;
  @Input() multiWorld?: boolean;
  @Input() resolution?: number;
  @Input() resolutions?: number[];
  @Input() rotation?: number;
  @Input() zoom?: number;
  @Input() zoomFactor?: number;
  @Input() center?: Coordinate;
  @Input() projection?: ProjectionLike;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const view = new View(this.viewProperties);
    this.view = view;
    view.setRotation(this.rotation ?? 0);
    const map = this.mapComponent.getMap();
    if (map) {
      map.setView(view);
      map.updateSize();
    }
  }

  ngAfterViewInit() {
    const map = this.mapComponent.getMap();
    if (map && this.view) {
      // register view events
      this.view.on('change:center', this.emitCenterChange);
      this.view.on('change:resolution', this.emitZoomChange);
      this.view.on('change:rotation', this.emitRotationChange);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: { [index: string]: any } = {};
    const view = this.view;
    const animate = !!view && this.enableAnimation;
    const target: ViewTarget = {};

    for (const key in changes) {
      const value = changes[key].currentValue;
      if (key === 'enableAnimation') {
        if (view && !value) {
          view.cancelAnimations();
        }
      } else if (!view) {
        properties[key] = key === 'center' ? fromLonLat(value) : value;
      } else if (key === 'zoom') {
        if (animate) {
          target.zoom = value;
        } else {
          view.setZoom(value);
        }
      } else if (key === 'center') {
        if (animate) {
          target.center = fromLonLat(value);
        } else {
          view.setCenter(fromLonLat(value));
        }
      } else if (key === 'rotation' && animate) {
        target.rotation = value ?? 0;
      } else if (key === 'minZoom') {
        view.setMinZoom(value);
      } else if (key === 'maxZoom') {
        view.setMaxZoom(value);
      } else {
        properties[key] = value;
      }
    }
    this.viewProperties = properties;
    if (view) {
      view.setProperties(this.viewProperties, false);
      if (animate) {
        this.animateTo(view, target);
      } else {
        view.setRotation(this.rotation ?? 0);
      }
    }
  }

  private animateTo(view: View, target: ViewTarget) {
    const center = view.getCenter();
    if (target.center && center) {
      // The input is canonical; glide to the world copy on screen rather than
      // across the globe when the vessel crosses the antimeridian.
      const width = getWidth(view.getProjection().getExtent());
      target.center = [
        target.center[0] + worldCopyOffset(center[0] - target.center[0], width),
        target.center[1]
      ];
    }
    const fromCenter = this.pending.center ?? center;
    if (
      target.center &&
      fromCenter &&
      Math.abs(target.center[0] - fromCenter[0]) < CENTER_EPSILON &&
      Math.abs(target.center[1] - fromCenter[1]) < CENTER_EPSILON
    ) {
      delete target.center;
    }
    if (target.zoom === (this.pending.zoom ?? view.getZoom())) {
      delete target.zoom;
    }
    if (target.rotation === (this.pending.rotation ?? view.getRotation())) {
      delete target.rotation;
    }
    if (
      target.center === undefined &&
      target.zoom === undefined &&
      target.rotation === undefined
    ) {
      return;
    }

    // An animation OpenLayers started for a gesture (a wheel or pinch zoom
    // settling) finishes first; the next change catches up.
    const ownAnimation = Object.keys(this.pending).length > 0;
    if (view.getAnimating() && !ownAnimation) {
      return;
    }
    // Under the user's finger the view follows the gesture, not an animation.
    if (view.getInteracting()) {
      if (target.center) view.setCenter(target.center);
      if (target.zoom !== undefined) view.setZoom(target.zoom);
      if (target.rotation !== undefined) view.setRotation(target.rotation);
      return;
    }

    const now = Date.now();
    const interval = now - this.lastMoveAt;
    let duration = MOVE_ANIMATION_MS;
    let easing = easeOut;
    if (target.zoom !== undefined) {
      duration = ZOOM_ANIMATION_MS;
      this.lastMoveAt = now;
    } else if (interval < SAME_MOVE_MS) {
      duration = Math.max(this.animationEndsAt - now, MIN_ANIMATION_MS);
      easing = this.easing;
    } else {
      if (interval <= FOLLOW_MAX_INTERVAL_MS) {
        duration = interval * FOLLOW_DURATION_SHARE;
        easing = linear;
      }
      this.lastMoveAt = now;
    }
    this.animationEndsAt = now + duration;
    this.easing = easing;

    const pending = { ...this.pending, ...target };
    const animationId = ++this.animationId;
    view.cancelAnimations();
    this.pending = pending;
    view.animate({ ...pending, duration, easing }, () => {
      // OpenLayers runs the callback in a later task, so one for an animation
      // replaced in the meantime must leave the newer target alone.
      if (animationId === this.animationId) {
        this.pending = {};
      }
    });
  }

  ngOnDestroy() {
    // A map can go while a change is still settling (the split view's second
    // pane closed just after a pan); its emit would read the map it no longer has.
    clearTimeout(this.timerCenterId);
    clearTimeout(this.timerZoomId);
    clearTimeout(this.timerRotationId);
    if (!this.view) {
      return;
    }
    this.view.un('change:center', this.emitCenterChange);
    this.view.un('change:resolution', this.emitZoomChange);
    this.view.un('change:rotation', this.emitRotationChange);
  }

  getView(): View | undefined {
    return this.view;
  }

  // Only arrow function works with addEventListener
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitCenterChange = (e: any) => {
    clearTimeout(this.timerCenterId);
    this.timerCenterId = setTimeout(() => {
      const view: View = e.target;
      const center = view.getCenter();
      const map = this.mapComponent.getMap();
      if (!center || !map) {
        return;
      }
      this.centerChange.emit(
        Object.assign(e, {
          lonlat: toLonLat(center),
          zoom: view.getZoom(),
          extent: transformExtent(
            view.calculateExtent(map.getSize()),
            view.getProjection().getCode(),
            'EPSG:4326'
          ),
          projCode: view.getProjection().getCode(),
          key: e.target.get(e.key)
        })
      );
    }, animateDuration + 10);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitZoomChange = (e: any) => {
    clearTimeout(this.timerZoomId);
    this.timerZoomId = setTimeout(() => {
      const view: View = e.target;
      const center = view.getCenter();
      const map = this.mapComponent.getMap();
      if (!center || !map) {
        return;
      }
      this.zoomChange.emit(
        Object.assign(e, {
          lonlat: toLonLat(center),
          zoom: view.getZoom(),
          extent: transformExtent(
            view.calculateExtent(map.getSize()),
            view.getProjection().getCode(),
            'EPSG:4326'
          ),
          projCode: view.getProjection().getCode(),
          key: e.target.get(e.key)
        })
      );
    }, animateDuration + 10);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitRotationChange = (e: any) => {
    clearTimeout(this.timerRotationId);
    this.timerRotationId = setTimeout(
      () => this.rotationChange.emit(e.target.get(e.key)),
      animateDuration + 10
    );
  };
}
