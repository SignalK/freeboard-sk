import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Map, MapBrowserEvent } from 'ol';
import MapEvent from 'ol/MapEvent';
import ObjectEvent from 'ol/Object';
import RenderEvent from 'ol/render/Event';
import { MapService } from './map.service';
import { MapReadyEvent } from './models';
import { AsyncSubject } from 'rxjs';
import { toLonLat, transformExtent } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { FeatureLike } from 'ol/Feature';
import { Extent } from 'ol/extent';

export interface FBMapEvent extends MapEvent {
  lonlat: Coordinate;
  zoom: number;
  zoomChanged: boolean;
  extent: Extent;
  projCode: string;
}

export interface FBClickEvent extends MapBrowserEvent<PointerEvent> {
  features: Array<FeatureLike>;
  lonlat: Coordinate;
}

export interface FBPointerEvent extends MapBrowserEvent<PointerEvent> {
  lonlat: Coordinate;
}

@Component({
  selector: 'ol-map',
  styleUrls: ['./map.component.scss'],
  template: `
    <div
      style="width: 100%; height: 100%; margin: 0; padding: 0; touch-action: none;"
      tabindex="-1"
    ></div>
    <ng-content></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class MapComponent implements OnInit, OnDestroy {
  private map: Map;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timeoutId: any;

  /**
   * This event is triggered after the map is initialized
   * Use this to have access to the maps and some helper functions
   */
  @Output() mapReady: AsyncSubject<MapReadyEvent> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  /**
   * This event is triggered after the user clicks on the map.
   * A true single click with no dragging and no double click.
   * Note that this event is delayed by 250 ms to ensure that it is not a double click.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() mapClick: EventEmitter<any> = new EventEmitter<any>();
  @Output() mapRightClick: EventEmitter<{
    features: FeatureLike[];
    lonlat: Coordinate;
  }> = new EventEmitter<{ features: FeatureLike[]; lonlat: Coordinate }>();
  @Output() mapContextMenu: EventEmitter<FBPointerEvent> =
    new EventEmitter<FBPointerEvent>();
  @Output() mapSingleClick: EventEmitter<FBClickEvent> =
    new EventEmitter<FBClickEvent>();
  @Output() mapDblClick: EventEmitter<FBClickEvent> =
    new EventEmitter<FBClickEvent>();
  @Output() mapMoveStart: EventEmitter<MapEvent> =
    new EventEmitter<FBMapEvent>();
  @Output() mapMoveEnd: EventEmitter<MapEvent> = new EventEmitter<FBMapEvent>();
  @Output() mapPointerDrag: EventEmitter<FBPointerEvent> =
    new EventEmitter<FBPointerEvent>();
  @Output() mapPointerMove: EventEmitter<FBPointerEvent> =
    new EventEmitter<FBPointerEvent>();
  @Output() mapPointerDown: EventEmitter<FBPointerEvent> =
    new EventEmitter<FBPointerEvent>();
  @Output() mapPostCompose: EventEmitter<RenderEvent> =
    new EventEmitter<RenderEvent>();
  @Output() mapPostRender: EventEmitter<MapEvent> =
    new EventEmitter<MapEvent>();
  @Output() mapPreCompose: EventEmitter<RenderEvent> =
    new EventEmitter<RenderEvent>();
  @Output() mapPropertyChange: EventEmitter<ObjectEvent> =
    new EventEmitter<ObjectEvent>();

  @Input() pixelRatio: number;
  @Input() keyboardEventTarget: Element | string;
  @Input() logo: string | boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() properties: { [index: string]: any };
  @Input() setFocus = '';
  @Input() hitTolerance = 5;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected element: ElementRef,
    protected mapService: MapService
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const target = this.element.nativeElement.firstElementChild;
    this.map = new Map();
    this.map.setTarget(target);
    this.map.setProperties(this.properties, true);
    // register the map in the injectable mapService
    this.mapService.addMap(this.map);

    this.map.once('postrender', () => {
      this.afterMapReady();
    });
  }

  ngOnDestroy() {
    this.map.un('singleclick', this.emitSingleClickEvent);
    this.map.un('dblclick', this.emitDblClickEvent);
    this.map.un('click', this.emitClickEvent);
    this.map.un('movestart', this.emitMoveStartEvent);
    this.map.un('moveend', this.emitMoveEndEvent);
    this.map.un('pointerdrag', this.emitPointerDragEvent);
    this.map.un('pointermove', this.emitPointerMoveEvent);
    this.map.un('postcompose', this.emitPostComposeEvent);
    this.map.un('postrender', this.emitPostRenderEvent);
    this.map.un('precompose', this.emitPreComposeEvent);
    // right click handler
    this.map
      .getViewport()
      .removeEventListener('contextmenu', this.rightClickHandler);
    this.map
      .getViewport()
      .removeEventListener('pointerdown', this.pointerDownHandler);
    this.map
      .getViewport()
      .removeEventListener('pointerup', this.pointerUpHandler);
    window.removeEventListener('resize', this.updateSizeThrottle);
    window.removeEventListener('orientationchange', this.updateSizeThrottle);

    this.map.setTarget(null);
    this.map = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.map && typeof changes.setFocus !== 'undefined') {
      if (changes.setFocus.currentValue) {
        this.focusMap();
      }
    }
  }

  afterMapReady() {
    // register map events
    this.map.on('singleclick', this.emitSingleClickEvent);
    this.map.on('dblclick', this.emitDblClickEvent);
    this.map.on('click', this.emitClickEvent);
    this.map.on('movestart', this.emitMoveStartEvent);
    this.map.on('moveend', this.emitMoveEndEvent);
    this.map.on('pointerdrag', this.emitPointerDragEvent);
    this.map.on('pointermove', this.emitPointerMoveEvent);
    this.map.on('postcompose', this.emitPostComposeEvent);
    this.map.on('postrender', this.emitPostRenderEvent);
    this.map.on('precompose', this.emitPreComposeEvent);

    // right click handler
    this.map
      .getViewport()
      .addEventListener('contextmenu', this.rightClickHandler);
    this.map
      .getViewport()
      .addEventListener('pointerdown', this.pointerDownHandler);
    this.map.getViewport().addEventListener('pointerup', this.pointerUpHandler);

    // react on window events
    window.addEventListener('resize', this.updateSizeThrottle, false);
    window.addEventListener(
      'orientationchange',
      this.updateSizeThrottle,
      false
    );

    this.updateSize();

    this.mapReady.next({ map: this.map, mapService: this.mapService });
    this.mapReady.complete();

    if (this.setFocus) {
      this.focusMap();
    }
  }

  // Only arrow function works with addEventListener

  // Long Press Detection (iOS & Android)
  private touchTimer: any;
  private evCache: { [id: number]: MouseEvent } = {};
  private clearTouchTimer = () => {
    clearTimeout(this.touchTimer);
    this.evCache = {};
  };
  private touchHold = () => {
    if (Object.keys(this.evCache).length === 1) {
      this.mapContextMenu.emit(Object.values(this.evCache)[0] as any);
      this.rightClickHandler(Object.values(this.evCache)[0]);
    }
  };
  private pointerDownHandler = (event) => {
    this.evCache[event.pointerId] = event;
    this.touchTimer = setTimeout(this.touchHold, 500);
    const c = toLonLat(this.map.getEventCoordinate(event));
    this.mapPointerDown.emit(Object.assign(event, { lonlat: c }));
  };
  private pointerUpHandler = (event) => {
    this.clearTouchTimer();
  };
  private rightClickHandler = (event: MouseEvent) => {
    this.clearTouchTimer();
    this.emitRightClickEvent(event);
  };

  private emitClickEvent = (event: MapBrowserEvent<PointerEvent>) => {
    this.mapClick.emit(this.augmentClickEvent(event));
  };

  private emitRightClickEvent = (event: MouseEvent) => {
    event.preventDefault();
    const c = this.map.getEventCoordinate(event);
    this.mapRightClick.emit({
      features: this.map.getFeaturesAtPixel(
        this.map.getPixelFromCoordinateInternal(c),
        {
          hitTolerance: this.hitTolerance
        }
      ),
      lonlat: toLonLat(c)
    });
  };
  private emitSingleClickEvent = (event: MapBrowserEvent<PointerEvent>) => {
    this.mapSingleClick.emit(this.augmentClickEvent(event));
  };
  private emitDblClickEvent = (event: MapBrowserEvent<PointerEvent>) => {
    this.mapDblClick.emit(this.augmentClickEvent(event));
  };

  // ** add {lonlat, features}fields to event
  private augmentClickEvent(event: MapBrowserEvent<PointerEvent>) {
    return Object.assign(event, {
      features: this.map.getFeaturesAtPixel(event.pixel, {
        hitTolerance: this.hitTolerance
      }),
      lonlat: toLonLat(event.coordinate)
    });
  }

  private zoomAtStart: number;
  private emitMoveStartEvent = (event: MapEvent) => {
    this.zoomAtStart = this.map.getView().getZoom();
    this.mapMoveStart.emit(this.augmentMoveEvent(event));
  };
  private emitMoveEndEvent = (event: MapEvent) => {
    this.mapMoveEnd.emit(this.augmentMoveEvent(event));
  };

  // ** add {lonlat, zoom, extent, projection code} fields to event
  private augmentMoveEvent(event: MapEvent) {
    const zoom = this.map.getView().getZoom();
    return Object.assign(event, {
      lonlat: this.getMapCenter(),
      zoom: zoom,
      zoomChanged: this.zoomAtStart !== zoom,
      extent: this.getMapExtent(),
      projCode: this.map.getView().getProjection().getCode()
    });
  }

  private emitPointerDragEvent = (event: MapBrowserEvent<PointerEvent>) => {
    this.clearTouchTimer();
    this.mapPointerDrag.emit(this.augmentPointerEvent(event));
  };
  private emitPointerMoveEvent = (event: MapBrowserEvent<PointerEvent>) => {
    this.clearTouchTimer();
    this.mapPointerMove.emit(this.augmentPointerEvent(event));
  };

  // ** add {lonlat} field to event
  private augmentPointerEvent(event: MapBrowserEvent<PointerEvent>) {
    return Object.assign(event, { lonlat: toLonLat(event.coordinate) });
  }

  private emitPostComposeEvent = (event: RenderEvent) =>
    this.mapPostCompose.emit(event);
  private emitPostRenderEvent = (event: MapEvent) =>
    this.mapPostRender.emit(event);
  private emitPreComposeEvent = (event: RenderEvent) =>
    this.mapPreCompose.emit(event);
  private emitPropertyChangeEvent = (event: ObjectEvent) =>
    this.mapPropertyChange.emit(event);

  private updateSizeThrottle = () => {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.map.updateSize();
    }, 100);
  };

  focusMap() {
    this.element.nativeElement.firstElementChild.focus();
  }

  getMap() {
    return this.map;
  }

  updateSize() {
    this.updateSizeThrottle();
  }

  getMapCenter(): Coordinate {
    if (!this.map) {
      return [0, 0];
    }
    return toLonLat(this.map.getView().getCenter());
  }

  getMapExtent() {
    if (!this.map) {
      return [0, 0, 0, 0];
    }
    const v = this.map.getView();
    const mrid = v.getProjection().getCode();

    return transformExtent(
      v.calculateExtent(this.map.getSize()),
      mrid,
      'EPSG:4326'
    );
  }
}
