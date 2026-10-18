import { ChangeDetectorRef, Directive, Input, OnInit } from '@angular/core';
import {
  Attribution,
  FullScreen,
  Rotate,
  ScaleLine,
  Zoom,
  ZoomSlider,
  ZoomToExtent
} from 'ol/control';
import type Map from 'ol/Map';
import { MapComponent } from './map.component';
import type { MapItemConfig } from './models';

@Directive({
  selector: 'ol-map > [olControls]',
  standalone: false
})
export class ControlsDirective implements OnInit {
  private controls: MapItemConfig[] = [];
  private readonly controlList = {
    attribution: Attribution,
    fullscreen: FullScreen,
    rotate: Rotate,
    scaleline: ScaleLine,
    zoom: Zoom,
    zoomslider: ZoomSlider,
    zoomtoextent: ZoomToExtent
  };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olControls(value: MapItemConfig[]) {
    this.controls = value;
    this.setControls();
  }

  ngOnInit() {
    this.setControls();
  }

  setControls() {
    const map = this.mapComponent.getMap();
    if (undefined !== map) {
      map.getControls().clear();
      if (!this.controls || this.controls.length < 0) {
        return;
      }
      for (const config of this.controls) {
        this.addControl(map, config);
      }
      this.changeDetectorRef.detectChanges();
    }
  }

  private addControl(map: Map, controlConfig: MapItemConfig) {
    const NewControl =
      this.controlList[controlConfig.name as keyof typeof this.controlList];
    if (!NewControl) {
      console.warn(`Unknown control ${controlConfig.name}`);
      return;
    }
    map.addControl(new NewControl(controlConfig.options));
  }
}
