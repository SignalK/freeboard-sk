import { Component, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { Control } from 'ol/control';
import { MapComponent } from './map.component';

@Component({
    selector: 'ol-map > ol-control',
    template: '<ng-content></ng-content>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlComponent implements OnInit, OnDestroy  {

    protected control: Control;
    public element: HTMLElement;
  
    constructor(
        protected changeDetectorRef: ChangeDetectorRef,
        protected elementRef: ElementRef,
        protected mapComponent: MapComponent
    ) {
        this.changeDetectorRef.detach();
    }
  
    ngOnInit() {
        if(this.elementRef.nativeElement) {
            this.element = this.elementRef.nativeElement;
            this.control = new Control({element: this.element});
            this.mapComponent.getMap().addControl(this.control);
        }
    }
  
    ngOnDestroy() {
        if (this.control) {
            this.mapComponent.getMap().removeControl(this.control);
            this.control = null;
        }
    }
}
