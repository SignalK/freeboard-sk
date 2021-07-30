import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {Map, MapBrowserEvent} from 'ol';
import MapEvent from 'ol/MapEvent';
import ObjectEvent from 'ol/Object';
import RenderEvent from 'ol/render/Event';
import {MapService} from './map.service';
import {MapReadyEvent} from './models';
import {AsyncSubject} from 'rxjs';
import {MapOptions} from 'ol/PluggableMap';
import { toLonLat, transformExtent } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';

@Component({
  selector: 'ol-map',
  styleUrls: ['./map.component.scss'],
  template: `
    <div style="width: 100%; height: 100%; margin: 0; padding: 0; touch-action: none;" tabindex=-1>
    </div><ng-content></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit, OnDestroy {

  private map: Map;
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
  @Output() mapClick: EventEmitter<any> = new EventEmitter<any>();
  @Output() mapSingleClick: EventEmitter<MapBrowserEvent> = new EventEmitter<MapBrowserEvent>();
  @Output() mapDblClick: EventEmitter<MapBrowserEvent> = new EventEmitter<MapBrowserEvent>();
  @Output() mapMoveStart: EventEmitter<MapEvent> = new EventEmitter<MapEvent>();
  @Output() mapMoveEnd: EventEmitter<MapEvent> = new EventEmitter<MapEvent>();
  @Output() mapPointerDrag: EventEmitter<MapBrowserEvent> = new EventEmitter<MapBrowserEvent>();
  @Output() mapPointerMove: EventEmitter<MapBrowserEvent> = new EventEmitter<MapBrowserEvent>();
  @Output() mapPostCompose: EventEmitter<RenderEvent> = new EventEmitter<RenderEvent>();
  @Output() mapPostRender: EventEmitter<MapEvent> = new EventEmitter<MapEvent>();
  @Output() mapPreCompose: EventEmitter<RenderEvent> = new EventEmitter<RenderEvent>();
  @Output() mapPropertyChange: EventEmitter<ObjectEvent> = new EventEmitter<ObjectEvent>();

  @Input() pixelRatio: number;
  @Input() keyboardEventTarget: Element | string;
  @Input() logo: string | boolean;
  @Input() properties: { [index: string]: any };
  @Input() setFocus: boolean= false;

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected element: ElementRef,
              protected mapService: MapService) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const target = this.element.nativeElement.firstElementChild;
    this.map = new Map(this as MapOptions);
    this.map.setTarget(target);
    this.map.setProperties(this.properties, true);
    // register the map in the injectable mapService
    this.mapService.addMap(this.map);

    this.map.once('postrender', event => {
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
    this.map.un('propertychange', this.emitPropertyChangeEvent);

    window.removeEventListener('resize', this.updateSizeThrottle);
    window.removeEventListener('orientationchange', this.updateSizeThrottle);

    this.map.setTarget(null);
    this.map = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.map && typeof changes.setFocus!=='undefined') {
      if(changes.setFocus.currentValue) {
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
    this.map.on('propertychange', this.emitPropertyChangeEvent);

    // react on window events
    window.addEventListener('resize', this.updateSizeThrottle, false);
    window.addEventListener('orientationchange', this.updateSizeThrottle, false);

    this.updateSize();

    this.mapReady.next({map: this.map, mapService: this.mapService});
    this.mapReady.complete();

    if(this.setFocus) { this.focusMap() }
  }

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
    if(!this.map) { return [0,0] }
    return toLonLat(this.map.getView().getCenter());
  }

  getMapExtent() {
    if(!this.map) { return [0,0,0,0] }
    let v= this.map.getView();
    let mrid= v.getProjection().getCode();

    return transformExtent(
        v.calculateExtent(this.map.getSize()),
        mrid, 
        'EPSG:4326'
    );
  }

  // Only arrow function works with addEventListener
  private emitClickEvent = (event: MapBrowserEvent) => {
    this.mapClick.emit(
      Object.assign(event, {
        features: this.map.getFeaturesAtPixel(event.pixel),
        lonlat: toLonLat(event.coordinate)
      })
    );
  }

  private emitSingleClickEvent = (event: MapBrowserEvent) => {
    this.mapSingleClick.emit(
      Object.assign(event, {
        features: this.map.getFeaturesAtPixel(event.pixel),
        lonlat: toLonLat(event.coordinate)
      })
    );
  }
  private emitDblClickEvent = (event: MapBrowserEvent) => {
    this.mapDblClick.emit(
      Object.assign(event, {
        features: this.map.getFeaturesAtPixel(event.pixel),
        lonlat: toLonLat(event.coordinate)
      })
    );
  }

  private emitMoveStartEvent = (event: MapEvent) => {
    this.mapMoveStart.emit(
      Object.assign(event, {
        lonlat: this.getMapCenter(),
        zoom: this.map.getView().getZoom(),
        extent: this.getMapExtent(),
        projCode: this.map.getView().getProjection().getCode()
      })
    );
  }
  private emitMoveEndEvent = (event: MapEvent) => {
    this.mapMoveEnd.emit(
      Object.assign(event, {
        lonlat: this.getMapCenter(),
        zoom: this.map.getView().getZoom(),
        extent: this.getMapExtent(),
        projCode: this.map.getView().getProjection().getCode()
      })
    );
  }

  private emitPointerDragEvent = (event: MapBrowserEvent) => {
    this.mapPointerDrag.emit(
      Object.assign(event, {
        lonlat: toLonLat(event.coordinate)
      })
    );
  }
  private emitPointerMoveEvent = (event: MapBrowserEvent) => {
    this.mapPointerMove.emit(
      Object.assign(event, {
        lonlat: toLonLat(event.coordinate)
      })
    );
  }
  private emitPostComposeEvent = (event: RenderEvent) => this.mapPostCompose.emit(event);
  private emitPostRenderEvent = (event: MapEvent) => this.mapPostRender.emit(event);
  private emitPreComposeEvent = (event: RenderEvent) => this.mapPreCompose.emit(event);
  private emitPropertyChangeEvent = (event: ObjectEvent) => this.mapPropertyChange.emit(event);

  private updateSizeThrottle = () => {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.map.updateSize();
    }, 100);
  }

}
