import {ChangeDetectorRef, Directive, Input, OnInit} from '@angular/core';
import {
  DoubleClickZoom,
  DragPan,
  DragRotate,
  DragZoom,
  KeyboardPan,
  KeyboardZoom,
  MouseWheelZoom,
  PinchZoom
} from 'ol/interaction';
import {MapComponent} from './map.component';

@Directive({
  selector: 'ol-map > [olInteractions]'
})
export class InteractionsDirective implements OnInit {

  private interactions = [];
  private readonly interactionList = {
    dragpan: DragPan,
    dragrotate: DragRotate,
    dragzoom: DragZoom,
    doubleclickzoom: DoubleClickZoom,
    keyboardpan: KeyboardPan,
    keyboardzoom: KeyboardZoom,
    mousewheelzoom: MouseWheelZoom,
    pinchzoom: PinchZoom
  };

  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected mapComponent: MapComponent) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olInteractions(value: any[]) {
    this.interactions = value;
    this.setInteractions();
  }

  ngOnInit() {
    this.setInteractions();
  }

  setInteractions() {
    const map = this.mapComponent.getMap();
    if (undefined !== map) {
      map.getInteractions().clear();
      if (!this.interactions || this.interactions.length < 0) return;
      for (const config of this.interactions) {
        this.addInteraction(map, config);
      }
      this.changeDetectorRef.detectChanges();
    }
  }

  private addInteraction(map, controlConfig) {
    if (!this.interactionList[controlConfig.name]) {
      console.error(`Unknown interaction ${controlConfig.name}`);
      return;
    }
    const newInteraction = new this.interactionList[controlConfig.name](controlConfig.options);
    map.addInteraction(newInteraction);
  }

}
