import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Output,
  OnInit,
  Input,
  EventEmitter,
} from '@angular/core';
import { Map } from 'ol';
import GeometryType from 'ol/geom/GeometryType';
import { Draw } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { Style } from 'ol/style';
import { MapComponent } from '../map.component';

@Component({
  selector: 'ol-map > ol-draw',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractionDrawComponent implements OnInit {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input() type: GeometryType = GeometryType.LINE_STRING;
  @Input() style: Style;

  @Output() change: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawStart: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawEnd: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawAbort: EventEmitter<DrawEvent> = new EventEmitter();

  private map: Map;
  private interaction: Draw;

  ngOnInit() {}

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addDrawInteraction();
  }

  ngOnDestroy() {
    this.map.removeInteraction(this.interaction);
    this.interaction.un('change', this.emitChangeEvent);
    this.interaction.un('drawstart', this.emitDrawStartEvent);
    this.interaction.un('drawend', this.emitDrawEndEvent);
    this.interaction.un('drawabort', this.emitDrawAbortEvent);
    this.interaction = null;
  }

  addDrawInteraction() {
    if (undefined !== this.map) {
      let opt: any = {
        type: this.type,
        stopClick: true,
      };
      if (this.style) {
        opt.style = this.style;
      }
      this.interaction = new Draw(opt);
      this.interaction.on('change', this.emitChangeEvent);
      this.interaction.on('drawstart', this.emitDrawStartEvent);
      this.interaction.on('drawend', this.emitDrawEndEvent);
      this.interaction.on('drawabort', this.emitDrawAbortEvent);
      this.map.addInteraction(this.interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** emit events
  private emitChangeEvent = (event: DrawEvent) => this.change.emit(event);
  private emitDrawStartEvent = (event: DrawEvent) => this.drawStart.emit(event);
  private emitDrawEndEvent = (event: DrawEvent) => this.drawEnd.emit(event);
  private emitDrawAbortEvent = (event: DrawEvent) => this.drawAbort.emit(event);
}
