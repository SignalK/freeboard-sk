import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  SimpleChange,
  input,
  output,
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature, MapBrowserEvent } from 'ol';
import PointerInteraction from 'ol/interaction/Pointer';
import { primaryAction } from 'ol/events/condition';
import { getWidth } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat, get as getProjection, toLonLat } from 'ol/proj';
import { GeoUtils } from 'src/app/lib/geoutils';
import { bearingDistanceRing } from '../../../bearing-distance';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import {
  fromLonLatArray,
  hitToleranceForPointer,
  mapifyCoords,
  worldCopyOffset
} from '../util';
import { Position } from 'src/app/types';
import { setHandleDrag } from '../handle-drag';
import { AsyncSubject } from 'rxjs';

// EPSG:3857 is built into OpenLayers, so the lookup always finds it
const WORLD_WIDTH = getWidth(getProjection('EPSG:3857')!.getExtent());

/** Where a dragged marker is: canonical lon/lat, plus the world copy (#572). */
export interface MarkerDragEvent {
  position: Position;
  worldOffset: number;
}

// ** Freeboard Bearing line component **
@Component({
  selector: 'ol-map > fb-bearing-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BearingLineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer?: Layer;
  public source?: VectorSource;
  protected features: Array<Feature> = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected vesselPosition = input<Coordinate | null>();
  protected markerPosition = input<Coordinate | null>();
  protected showMarker = input<boolean>();
  /** draw a marker at the origin (when it is not the vessel, already drawn) */
  protected showOrigin = input<boolean>(false);
  /** draw the range ring: points as far from the origin as the marker */
  protected showRing = input<boolean>(false);
  /** let the user drag the marker to a new position */
  protected markerDraggable = input<boolean>(false);

  /** the marker while it is dragged */
  markerDrag = output<MarkerDragEvent>();
  protected labelMinZoom = input<number>(10);
  protected markerName = input<string>('');

  @Input() mapZoom = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() bearingStyles?: { [key: string]: any };
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: { [index: string]: any };

  public mapifiedRadius = 0;
  public mapifiedLine: Array<Coordinate> = [];

  private interaction?: PointerInteraction;
  // the finger that grabbed the marker, and where the marker was before
  private dragPointerId?: number;
  private dragOrigin?: MarkerDragEvent;
  private cursorSet = false;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.markerPosition();
      this.vesselPosition();
      this.showMarker();
      this.showOrigin();
      this.showRing();
      this.parseValues();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
    effect(() => {
      this.labelMinZoom();
      this.markerName();
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabel();
      }
    });
  }

  ngOnInit() {
    this.parseValues();
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    this.interaction = new PointerInteraction({
      handleDownEvent: (e) => this.onDown(e),
      handleDragEvent: (e) => this.onDrag(e),
      handleUpEvent: () => this.onUp(),
      handleMoveEvent: (e) => this.onMove(e)
    });
    map?.addInteraction(this.interaction);
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key === 'mapZoom') {
          this.handleLabelZoomChange(key, changes[key]);
        } else if (key === 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.interaction) {
      map?.removeInteraction(this.interaction);
    }
    this.endDrag();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = undefined;
    }
  }

  parseValues() {
    const fa: Feature[] = [];
    const vesselPosition = this.vesselPosition();
    const markerPosition = this.markerPosition();
    if (this.showOrigin() && Array.isArray(vesselPosition)) {
      const fo = new Feature({
        geometry: new Point(fromLonLat(vesselPosition))
      });
      fo.setId('origin.point');
      fo.setStyle(this.buildStyle('origin'));
      fa.push(fo);
    }
    if (Array.isArray(vesselPosition) && Array.isArray(markerPosition)) {
      this.mapifiedLine = mapifyCoords([vesselPosition, markerPosition]);
      const fl = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      fl.setStyle(this.buildStyle('line'));
      fa.push(fl);
      let fp = new Feature({
        geometry: new Point(fromLonLat(markerPosition))
      });
      fp.setId('d.base');
      fp.setStyle(this.buildStyle('line'));
      this.updateLabel(fp);
      fa.push(fp);
      if (this.showRing()) {
        const d = GeoUtils.distanceTo(vesselPosition, markerPosition);
        if (d > 0) {
          const fr = new Feature({
            geometry: bearingDistanceRing(vesselPosition, d).transform(
              'EPSG:4326',
              'EPSG:3857'
            )
          });
          fr.setStyle(this.buildStyle('ring'));
          fa.push(fr);
        }
      }
      if (this.showMarker()) {
        fp = new Feature({
          geometry: new Point(fromLonLat(markerPosition))
        });
        fp.setId('dest.point');
        fp.setStyle(this.buildStyle('marker'));
        fa.push(fp);
      }
    }
    this.features = fa;
  }

  private markerAt(e: MapBrowserEvent): boolean {
    if (!this.markerDraggable() || !this.layer) {
      return false;
    }
    const pointerType = (e.originalEvent as PointerEvent)?.pointerType;
    return !!e.map.forEachFeatureAtPixel(
      e.pixel,
      (f) => f.getId() === 'dest.point',
      {
        layerFilter: (l) => l === this.layer,
        hitTolerance: hitToleranceForPointer(pointerType, 6, 14)
      }
    );
  }

  private onMove(e: MapBrowserEvent) {
    if (this.dragPointerId === undefined) {
      this.setCursor(this.markerAt(e) ? 'grab' : '');
    }
  }

  private onDown(e: MapBrowserEvent): boolean {
    // the primary button or first finger only: a right-click on the marker
    // still opens the chart menu
    if (!primaryAction(e) || !this.markerAt(e)) {
      return false;
    }
    this.dragPointerId = (e.originalEvent as PointerEvent).pointerId;
    this.dragOrigin = {
      position: this.markerPosition() as Position,
      worldOffset: worldCopyOffset(e.coordinate[0], WORLD_WIDTH)
    };
    setHandleDrag(e.map, this.dragPointerId);
    this.setCursor('grabbing');
    // true: this gesture is the drag, so the chart does not pan
    return true;
  }

  private onDrag(e: MapBrowserEvent) {
    // After an abort OpenLayers keeps sending this gesture's drags until the
    // fingers lift; there is nothing left to move.
    if (this.dragPointerId === undefined) {
      return;
    }
    if ((e.originalEvent as PointerEvent).pointerId !== this.dragPointerId) {
      // a second finger: a pinch or a slip, so put the marker back
      if (this.dragOrigin) {
        this.markerDrag.emit(this.dragOrigin);
      }
      this.endDrag();
      return;
    }
    this.markerDrag.emit({
      position: GeoUtils.normaliseCoords(toLonLat(e.coordinate) as Position),
      worldOffset: worldCopyOffset(e.coordinate[0], WORLD_WIDTH)
    });
  }

  private onUp(): boolean {
    this.endDrag();
    return false;
  }

  private endDrag() {
    if (this.dragPointerId !== undefined) {
      const map = this.mapComponent.getMap();
      if (map) {
        setHandleDrag(map, null);
      }
    }
    this.dragPointerId = undefined;
    this.dragOrigin = undefined;
    this.setCursor('');
  }

  /** Only clear a cursor this layer set, so another tool's stays. */
  private setCursor(cursor: string) {
    const target = this.mapComponent.getMap()?.getTargetElement();
    if (!target || (!cursor && !this.cursorSet)) {
      return;
    }
    target.style.cursor = cursor;
    this.cursorSet = !!cursor;
  }

  // build target style
  buildStyle(key: string): Style | Style[] {
    if (this.bearingStyles && this.bearingStyles[key]) {
      return this.bearingStyles[key];
    } else {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
      } else {
        // default style
        return [
          new Style({
            stroke: new Stroke({
              color: 'white',
              width: 6
            })
          }),
          new Style({
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 2,
                color: 'white'
              }),
              fill: new Fill({
                color: 'rgba(221, 149, 0, 1)'
              })
            }),
            stroke: new Stroke({
              color: 'rgba(221, 149, 0, 1)',
              width: 2
            }),
            text: new Text({
              text: '',
              offsetX: 0,
              offsetY: -29
            })
          })
        ];
      }
    }
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key === 'mapZoom') {
      if (typeof this.labelMinZoom() !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom() &&
            change.previousValue < this.labelMinZoom()) ||
          (change.currentValue < this.labelMinZoom() &&
            change.previousValue >= this.labelMinZoom())
        ) {
          this.updateLabel();
        }
      }
    }
  }

  // update feature labels
  updateLabel(f?: Feature) {
    if (!f && this.source) {
      f = this.source.getFeatureById('d.base') as Feature;
    }
    if (!f) {
      return;
    }
    try {
      let s = f.getStyle();
      if (!s) {
        return;
      }
      s = Array.isArray(s) ? s[1] : s;
      const ts = (s as Style).getText();
      if (!ts) {
        return;
      }
      ts?.setText(
        Math.abs(this.mapZoom) >= this.labelMinZoom()
          ? (this.markerName() ?? '')
          : ''
      );
      (s as Style).setText(ts);
      f.setStyle(s);
    } catch {
      // StyleLike may be a style function rather than a Style; nothing to relabel.
    }
  }
}
