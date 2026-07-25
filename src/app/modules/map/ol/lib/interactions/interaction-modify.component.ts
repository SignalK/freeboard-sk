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

/**
 * Decides whether a map event should delete the grabbed route vertex.
 *
 * Two delete gestures are supported, matching the on-screen instructions
 * ("Ctrl-Click or Tap-hold to remove point from a line"):
 * - **Ctrl-Click** (mouse) — a primary-button click, so OpenLayers re-snaps the
 *   grabbed vertex to the point under the cursor before this runs.
 * - **Tap-hold** (touch/pen) — map.component flags `vertexDeleteOnRelease`, which
 *   we consume on the following release. OL 10 emits no `contextmenu` for touch,
 *   so this is the only touch delete path.
 *
 * A mouse right-click (`contextmenu`) is deliberately **not** a delete gesture: it
 * never re-snaps the grabbed vertex (its pointerdown is not a primary action), so
 * it would delete whatever vertex was last touched rather than the one clicked
 * (#575); and Freeboard already uses right-click for the map context menu.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const vertexDeleteCondition = (e: MapBrowserEvent<any>): boolean => {
  if (
    (e.type === 'pointerup' ||
      e.type === 'singleclick' ||
      e.type === 'click') &&
    e.map.get('vertexDeleteOnRelease')
  ) {
    e.map.set('vertexDeleteOnRelease', false);
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return e.type === 'click' && (e.originalEvent as any).ctrlKey;
};

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
      this.interaction = new Modify({
        features: this.features,
        deleteCondition: vertexDeleteCondition
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
