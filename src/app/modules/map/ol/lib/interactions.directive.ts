import { ChangeDetectorRef, Directive, Input, OnInit } from '@angular/core';
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
import type Map from 'ol/Map';
import { MapComponent } from './map.component';
import type { MapItemConfig } from './models';

@Directive({
  selector: 'ol-map > [olInteractions]',
  standalone: false
})
export class InteractionsDirective implements OnInit {
  private interactions: MapItemConfig[] = [];
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

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input()
  set olInteractions(value: MapItemConfig[]) {
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

  private addInteraction(map: Map, controlConfig: MapItemConfig) {
    const NewInteraction =
      this.interactionList[
        controlConfig.name as keyof typeof this.interactionList
      ];
    if (!NewInteraction) {
      console.error(`Unknown interaction ${controlConfig.name}`);
      return;
    }
    map.addInteraction(new NewInteraction(controlConfig.options));
  }
}
