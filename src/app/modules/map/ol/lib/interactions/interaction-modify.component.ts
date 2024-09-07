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

@Component({
  selector: 'ol-map > ol-modify',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deleteCondition: (e: MapBrowserEvent<any>) => {
          if (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e.type === 'click' && (e.originalEvent as any).ctrlKey) ||
            e.type === 'contextmenu'
          ) {
            return true;
          } else {
            return false;
          }
        }
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
