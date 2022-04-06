import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import Overlay, { Options, PanIntoViewOptions } from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from './map.component';
import { Coordinate } from './models';

@Component({
  selector: 'ol-map > ol-overlay',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayComponent implements OnInit, OnChanges, OnDestroy {
  protected overlay: Overlay;
  public element: HTMLElement;

  @Input() id: number | string;
  @Input() className: string;
  @Input() offset: number[];
  @Input() position: Coordinate;
  @Input() positioning: OverlayPositioning | string;
  @Input() stopEvent: boolean;
  @Input() insertFirst: boolean;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected elementRef: ElementRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    if (this.elementRef.nativeElement) {
      this.element = this.elementRef.nativeElement;
      this.overlay = new Overlay(this as Options);
      this.mapComponent.getMap().addOverlay(this.overlay);
      this.overlay.setPosition(fromLonLat(this.position));
    }
  }

  ngOnDestroy() {
    if (this.overlay) {
      this.mapComponent.getMap().removeOverlay(this.overlay);
      this.overlay = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.overlay && changes.hasOwnProperty('position')) {
      this.overlay.setPosition(fromLonLat(changes.position.currentValue));
    }
  }

  panIntoView(panIntoViewOptions: PanIntoViewOptions) {
    this.overlay.panIntoView(panIntoViewOptions);
  }
}
