import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Output,
  Input,
  EventEmitter
} from '@angular/core';
import { Map, MapBrowserEvent } from 'ol';
import { Draw } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { StyleLike } from 'ol/style/Style';
import { MapComponent } from '../map.component';
import { withWaypointSnap } from '../waypoint-snap';

/**
 * `Draw` that places points on a nearby waypoint (#881). Every pointer event is
 * snapped, not only the click, so the sketch's cursor point jumps onto the
 * waypoint before the click and shows the user where the point will go.
 */
export class WaypointSnappingDraw extends Draw {
  override handleEvent(event: MapBrowserEvent<PointerEvent>): boolean {
    return withWaypointSnap(event, () => super.handleEvent(event));
  }
}

@Component({
  selector: 'ol-map > ol-draw',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InteractionDrawComponent {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input() type = 'LineString';
  @Input() style: StyleLike;
  @Input() stopClick: boolean;
  /** Snap drawn points to the waypoints shown on the map. */
  @Input() snapToWaypoints = false;

  @Output() change: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawStart: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawEnd: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawAbort: EventEmitter<DrawEvent> = new EventEmitter();

  private map: Map;
  private interaction: Draw;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opt: any = {
        type: this.type,
        stopClick: this.stopClick ?? true
      };
      if (this.style) {
        opt.style = this.style;
      }
      this.interaction = this.snapToWaypoints
        ? new WaypointSnappingDraw(opt)
        : new Draw(opt);
      this.interaction.on('change', this.emitChangeEvent);
      this.interaction.on('drawstart', this.emitDrawStartEvent);
      this.interaction.on('drawend', this.emitDrawEndEvent);
      this.interaction.on('drawabort', this.emitDrawAbortEvent);
      this.map.addInteraction(this.interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Complete the current sketch, as a double-click does — dispatches `drawend`
   * and adds the sketch to the layer, letting a "Finish" button end a route
   * draw without the double-click gesture. Whether the sketch has enough points
   * is enforced by the caller's Finish gating, not here.
   */
  finishDrawing() {
    this.interaction?.finishDrawing();
  }

  /**
   * Remove the last point placed in the current sketch, letting an "Undo"
   * button step a route draw back one point at a time. Successive calls peel
   * off successive points; a no-op once the sketch is empty.
   */
  removeLastPoint() {
    this.interaction?.removeLastPoint();
  }

  // ** emit events
  private emitChangeEvent = (event: DrawEvent) => this.change.emit(event);
  private emitDrawStartEvent = (event: DrawEvent) => this.drawStart.emit(event);
  private emitDrawEndEvent = (event: DrawEvent) => this.drawEnd.emit(event);
  private emitDrawAbortEvent = (event: DrawEvent) => this.drawAbort.emit(event);
}
