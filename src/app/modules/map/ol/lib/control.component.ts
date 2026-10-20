import {
  Component,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Map as OlMap } from 'ol';
import { Control } from 'ol/control';
import { MapComponent } from './map.component';

@Component({
  selector: 'ol-map > ol-control',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ControlComponent implements OnInit, OnDestroy {
  protected control?: Control;
  public element?: HTMLElement;
  /** Kept: the map is gone from its component by the time this one goes. */
  private map?: OlMap;

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
      this.control = new Control({ element: this.element });
      this.map = this.mapComponent.getMap();
      this.map?.addControl(this.control);
    }
  }

  ngOnDestroy() {
    if (this.control) {
      this.map?.removeControl(this.control);
      this.control = undefined;
    }
    this.map = undefined;
  }
}
