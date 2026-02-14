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
import { transformExtent, toLonLat, fromLonLat } from 'ol/proj';
import { Coordinate, Extent } from './models';
import { MapComponent } from './map.component';
import { ProjectionLike } from 'ol/proj';

const animateDuration = 500;

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
  private view: View;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private viewProperties: { [index: string]: any } = {};

  @Output() centerChange: EventEmitter<Coordinate> =
    new EventEmitter<Coordinate>();
  @Output() rotationChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() zoomChange: EventEmitter<number> = new EventEmitter<number>();

  @Input() enableAnimation = false;
  @Input() constrainRotation: boolean | number;
  @Input() constrainResolution: boolean;
  @Input() enableRotation: boolean;
  @Input() extent: Extent;
  @Input() maxResolution: number;
  @Input() minResolution: number;
  @Input() maxZoom: number;
  @Input() minZoom: number;
  @Input() multiWorld: boolean;
  @Input() resolution: number;
  @Input() resolutions: number[];
  @Input() rotation: number;
  @Input() zoom: number;
  @Input() zoomFactor: number;
  @Input() center: Coordinate;
  @Input() projection: ProjectionLike;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.view = new View(this.viewProperties);
    this.view.setRotation(this.rotation ?? 0);
    const map = this.mapComponent.getMap();
    if (map) {
      map.setView(this.view);
      map.updateSize();
    }
  }

  ngAfterViewInit() {
    const map = this.mapComponent.getMap();
    if (map) {
      // register view events
      this.view.on('change:center', this.emitCenterChange);
      this.view.on('change:resolution', this.emitZoomChange);
      this.view.on('change:rotation', this.emitRotationChange);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: { [index: string]: any } = {};

    for (const key in changes) {
      if (key === 'zoom') {
        if (this.view) {
          if (this.enableAnimation) {
            this.view.animate({
              zoom: changes[key].currentValue,
              duration: animateDuration
            });
          } else {
            this.view.setZoom(changes[key].currentValue);
          }
        } else {
          properties[key] = changes[key].currentValue;
        }
      } else if (key === 'center') {
        if (this.view) {
          if (this.enableAnimation) {
            this.view.animate({
              center: changes[key].currentValue,
              duration: animateDuration
            });
          } else {
            this.view.setCenter(fromLonLat(changes[key].currentValue));
          }
        } else {
          properties[key] = fromLonLat(changes[key].currentValue);
        }
      } else if (key === 'minZoom') {
        if (this.view) {
          this.view.setMinZoom(changes[key].currentValue);
        } else {
          properties[key] = changes[key].currentValue;
        }
      } else if (key === 'maxZoom') {
        if (this.view) {
          this.view.setMaxZoom(changes[key].currentValue);
        } else {
          properties[key] = changes[key].currentValue;
        }
      } else {
        properties[key] = changes[key].currentValue;
      }
    }
    this.viewProperties = properties;
    if (this.view) {
      this.view.setProperties(this.viewProperties, false);
      this.view.setRotation(this.rotation ?? 0);
    }
  }

  ngOnDestroy() {
    if (!this.view) {
      return;
    }
    this.view.un('change:center', this.emitCenterChange);
    this.view.un('change:resolution', this.emitZoomChange);
    this.view.un('change:rotation', this.emitRotationChange);
  }

  getView(): View {
    return this.view;
  }

  // Only arrow function works with addEventListener
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitCenterChange = (e: any) => {
    clearTimeout(this.timerCenterId);
    this.timerCenterId = setTimeout(
      () =>
        this.centerChange.emit(
          Object.assign(e, {
            lonlat: toLonLat(this.view.getCenter()),
            zoom: this.view.getZoom(),
            extent: transformExtent(
              this.view.calculateExtent(this.mapComponent.getMap().getSize()),
              this.view.getProjection().getCode(),
              'EPSG:4326'
            ),
            projCode: this.view.getProjection().getCode(),
            key: e.target.get(e.key)
          })
        ),
      animateDuration + 10
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitZoomChange = (e: any) => {
    clearTimeout(this.timerZoomId);
    this.timerZoomId = setTimeout(
      () =>
        this.zoomChange.emit(
          Object.assign(e, {
            lonlat: toLonLat(this.view.getCenter()),
            zoom: this.view.getZoom(),
            extent: transformExtent(
              this.view.calculateExtent(this.mapComponent.getMap().getSize()),
              this.view.getProjection().getCode(),
              'EPSG:4326'
            ),
            projCode: this.view.getProjection().getCode(),
            key: e.target.get(e.key)
          })
        ),
      animateDuration + 10
    );
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
