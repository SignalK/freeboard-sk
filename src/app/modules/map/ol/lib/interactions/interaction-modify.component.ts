import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Output,
  Input,
  EventEmitter
} from '@angular/core';
import { Map, Feature, Collection, MapBrowserEvent } from 'ol';
import { Geometry } from 'ol/geom';
import { Modify } from 'ol/interaction';
import { ModifyEvent } from 'ol/interaction/Modify';
import { MapComponent } from '../map.component';
import { hitToleranceForPointer } from '../util';
import { markVertexDeleted } from '../vertex-delete';

/**
 * Decides whether a map event should delete the grabbed route vertex.
 *
 * This is the **Ctrl-Click** (mouse) path — a primary-button click, so OpenLayers
 * re-snaps the grabbed vertex to the point under the cursor before this runs. The
 * **Tap-hold** (touch/pen) path no longer goes through `deleteCondition`: it
 * removes the vertex directly, mid-hold, from the hold timer (see
 * `tryDeleteHeldVertexOnHold`).
 *
 * A mouse right-click (`contextmenu`) is deliberately **not** a delete gesture: it
 * never re-snaps the grabbed vertex (its pointerdown is not a primary action), so
 * it would delete whatever vertex was last touched rather than the one clicked
 * (#575); and Freeboard already uses right-click for the map context menu.
 *
 * A delete flags `VERTEX_DELETED_IN_GESTURE` so the click the same release
 * produces is not also read as a route extension (#608).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const vertexDeleteCondition = (e: MapBrowserEvent<any>): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (e.type === 'click' && (e.originalEvent as any).ctrlKey) {
    markVertexDeleted(e.map);
    return true;
  }
  return false;
};

/** OpenLayers' own default `pixelTolerance`, kept for mouse pointers. */
const MOUSE_VERTEX_TOLERANCE = 10;
/** Touch radius, matching the tolerance the rest of the map uses for a finger. */
const TOUCH_VERTEX_TOLERANCE = 15;

/**
 * `Modify` whose vertex tolerance follows the pointer in use (#643).
 *
 * One `pixelTolerance` for every pointer type is too tight for a finger: a press
 * landing more than 10px from the vertex it aims at grabs the *segment* instead,
 * which inserts a point. So a tap leaves a stray vertex behind, and a tap-hold
 * removes that freshly inserted point rather than the vertex under the finger —
 * the delete appears to do nothing.
 *
 * Both radii match `hitToleranceForPointer`, which keeps this aligned with the
 * route-extend hit test — that guard must stay >= this tolerance or a single
 * click can both insert a vertex and append an end point (#598).
 *
 * OL takes `pixelTolerance` only as a constructor option, so switching it per
 * gesture means writing the field it is stored in. `interaction-modify.component.spec`
 * asserts that field exists, so an OL upgrade that renames it fails the suite
 * rather than silently reverting every pointer to the mouse radius.
 */
export class PointerAwareModify extends Modify {
  override handleEvent(
    event: MapBrowserEvent<KeyboardEvent | PointerEvent | WheelEvent>
  ): boolean {
    const pointerType = (event.originalEvent as PointerEvent)?.pointerType;
    // Events carrying no pointer type (wheel, keyboard) must leave the tolerance
    // as the gesture in progress set it.
    if (pointerType) {
      (this as unknown as { pixelTolerance_: number }).pixelTolerance_ =
        hitToleranceForPointer(
          pointerType,
          MOUSE_VERTEX_TOLERANCE,
          TOUCH_VERTEX_TOLERANCE
        );
    }
    return super.handleEvent(event);
  }
}

@Component({
  selector: 'ol-map > ol-modify',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InteractionModifyComponent {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input() features: Collection<Feature<Geometry>>;

  @Output() change: EventEmitter<ModifyEvent> = new EventEmitter();
  @Output() modifyStart: EventEmitter<ModifyEvent> = new EventEmitter();
  @Output() modifyEnd: EventEmitter<ModifyEvent> = new EventEmitter();

  private map: Map;
  private interaction: Modify;

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addModifyInteraction();
  }

  ngOnDestroy() {
    this.map.removeInteraction(this.interaction);
    this.interaction.un('change', this.emitChangeEvent);
    this.interaction.un('modifystart', this.emitModifyStartEvent);
    this.interaction.un('modifyend', this.emitModifyEndEvent);
    this.interaction = null;
  }

  addModifyInteraction() {
    if (undefined !== this.map) {
      this.interaction = new PointerAwareModify({
        features: this.features,
        deleteCondition: vertexDeleteCondition,
        pixelTolerance: MOUSE_VERTEX_TOLERANCE
      });
      this.interaction.on('change', this.emitChangeEvent);
      this.interaction.on('modifystart', this.emitModifyStartEvent);
      this.interaction.on('modifyend', this.emitModifyEndEvent);
      this.map.addInteraction(this.interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** emit events

  private emitChangeEvent = (event: ModifyEvent) => this.change.emit(event);
  private emitModifyStartEvent = (event: ModifyEvent) =>
    this.modifyStart.emit(event);
  private emitModifyEndEvent = (event: ModifyEvent) =>
    this.modifyEnd.emit(event);
}
