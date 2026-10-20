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
import { DrawEvent, Options as DrawOptions } from 'ol/interaction/Draw';
import { StyleLike } from 'ol/style/Style';
import BaseEvent from 'ol/events/Event';
import { MapComponent } from '../map.component';
import {
  SnapPress,
  snapPress,
  withPressSnap,
  withWaypointSnap
} from '../waypoint-snap';

/** Draw's own `clickTolerance` default, in pixels. */
const DRAW_CLICK_TOLERANCE = 6;

/** The events Draw places or previews a point from. */
const SNAPPED_EVENTS = new Set([
  'pointermove',
  'pointerdown',
  'pointerdrag',
  'pointerup'
]);

/** Draw's private pointer-move handler, which its long-press timer calls. */
type DrawInternals = {
  handlePointerMove_: (event: MapBrowserEvent<PointerEvent>) => void;
};

/**
 * `Draw` that places points on a nearby waypoint (#881). The pointer is
 * snapped while it hovers, so the sketch's cursor point jumps onto the
 * waypoint before the click and shows the user where the point will go.
 *
 * From a press until its release, events are snapped the way the press was
 * (`withPressSnap`), keeping Draw's click-or-drag test intact. That includes
 * the move event Draw's long-press timer (`dragVertexDelay`) builds from the
 * raw press and hands straight to its private `handlePointerMove_`, bypassing
 * `handleEvent`; so that handler is wrapped too. The spec asserts it exists,
 * so an OL upgrade that renames it fails the suite rather than silently
 * dropping held clicks on a waypoint.
 */
export class WaypointSnappingDraw extends Draw {
  private press: SnapPress | null = null;
  private snapping = false;
  /** The distance Draw takes a press-and-release as a click within. */
  private readonly clickTolerance: number;

  constructor(options: DrawOptions) {
    super(options);
    this.clickTolerance = options.clickTolerance ?? DRAW_CLICK_TOLERANCE;
    const internals = this as unknown as DrawInternals;
    const move = internals.handlePointerMove_.bind(this);
    internals.handlePointerMove_ = (event) =>
      this.snapped(event, () => move(event));
  }

  override handleEvent(event: MapBrowserEvent<PointerEvent>): boolean {
    if (!SNAPPED_EVENTS.has(event.type)) {
      return super.handleEvent(event);
    }
    if (event.type === 'pointerdown') {
      this.press = snapPress(event);
    }
    try {
      return this.snapped(event, () => super.handleEvent(event));
    } finally {
      if (event.type === 'pointerup') {
        this.press = null;
      }
    }
  }

  /** Run `handle` with `event` snapped, unless an outer call already did. */
  private snapped<T>(event: MapBrowserEvent<PointerEvent>, handle: () => T): T {
    if (this.snapping) {
      return handle();
    }
    this.snapping = true;
    try {
      return this.press
        ? withPressSnap(event, this.press, this.clickTolerance, handle)
        : withWaypointSnap(event, handle);
    } finally {
      this.snapping = false;
    }
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
  @Input() style?: StyleLike;
  @Input() stopClick?: boolean;
  /** Snap drawn points to the waypoints shown on the map. */
  @Input() snapToWaypoints = false;

  @Output() change: EventEmitter<BaseEvent> = new EventEmitter();
  @Output() drawStart: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawEnd: EventEmitter<DrawEvent> = new EventEmitter();
  @Output() drawAbort: EventEmitter<DrawEvent> = new EventEmitter();

  // Set in ngAfterViewInit; the parent map exists from its own ngOnInit.
  private map!: Map;
  private interaction: Draw | null = null;

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addDrawInteraction();
  }

  ngOnDestroy() {
    const interaction = this.interaction;
    if (!interaction) {
      return;
    }
    this.map.removeInteraction(interaction);
    interaction.un('change', this.emitChangeEvent);
    interaction.un('drawstart', this.emitDrawStartEvent);
    interaction.un('drawend', this.emitDrawEndEvent);
    interaction.un('drawabort', this.emitDrawAbortEvent);
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
  private emitChangeEvent = (event: BaseEvent) => this.change.emit(event);
  private emitDrawStartEvent = (event: DrawEvent) => this.drawStart.emit(event);
  private emitDrawEndEvent = (event: DrawEvent) => this.drawEnd.emit(event);
  private emitDrawAbortEvent = (event: DrawEvent) => this.drawAbort.emit(event);
}
