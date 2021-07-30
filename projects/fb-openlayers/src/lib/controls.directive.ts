import {ChangeDetectorRef, Directive, Input, OnInit} from '@angular/core';
import {Attribution, FullScreen, Rotate, ScaleLine, Zoom, ZoomSlider, ZoomToExtent} from 'ol/control';
import {MapComponent} from './map.component';

@Directive({
  selector: 'ol-map > [olControls]'
})
export class ControlsDirective implements OnInit {

  private controls = [];
  private readonly controlList = {
    attribution: Attribution,
    fullscreen: FullScreen,
    rotate: Rotate,
    scaleline: ScaleLine,
    zoom: Zoom,
    zoomslider: ZoomSlider,
    zoomtoextent: ZoomToExtent
  };

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olControls(value: any[]) {
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

  private addControl(map, controlConfig) {
    if (!this.controlList[controlConfig.name]) {
      console.warn(`Unknown control ${controlConfig.name}`);
      return;
    }
    const newControl = new this.controlList[controlConfig.name](controlConfig.options);
    map.addControl(newControl);
  }

}
