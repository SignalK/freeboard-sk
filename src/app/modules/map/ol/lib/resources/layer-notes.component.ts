import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, RegularShape, Stroke, Fill } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent } from '../models';
import { AsyncSubject } from 'rxjs';
import { SKNote } from 'src/app/modules';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-notes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer;
  public source: VectorSource;
  protected features: Array<Feature>;

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() notes: { [key: string]: any };
  @Input() noteStyles: { [key: string]: Style };
  @Input() opacity: number;
  @Input() visible: boolean;
  @Input() extent: Extent;
  @Input() zIndex: number;
  @Input() minResolution: number;
  @Input() maxResolution: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties: { [index: string]: any };

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseNotes(this.notes);
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: { [index: string]: any } = {};

      for (const key in changes) {
        if (key === 'notes') {
          this.parseNotes(changes[key].currentValue);
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'noteStyles') {
          // handle note style change
        } else if (key === 'layerProperties') {
          this.layer.setProperties(properties, false);
        } else {
          properties[key] = changes[key].currentValue;
        }
      }
      this.layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseNotes(notes: { [key: string]: any } = this.notes) {
    const fa: Feature[] = [];
    for (const w in notes) {
      if (!notes[w].position) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat([notes[w].position.longitude, notes[w].position.latitude])
        ),
        name: notes[w].name
      });
      f.setId('note.' + w);
      f.setStyle(this.buildStyle(w, notes[w]));
      fa.push(f);
    }
    this.features = fa;
  }

  // build note style
  buildStyle(id: string, note): Style {
    if (typeof this.noteStyles !== 'undefined') {
      if (note.properties?.skType) {
        return this.noteStyles[note.properties?.skType];
      } else {
        return this.noteStyles.default;
      }
    } else if (this.layerProperties && this.layerProperties.style) {
      return this.layerProperties.style;
    } else {
      // default styles
      return new Style({
        image: new RegularShape({
          points: 4,
          radius: 10,
          fill: new Fill({ color: 'gold' }),
          stroke: new Stroke({
            color: 'black',
            width: 1
          }),
          rotation: (Math.PI / 180) * 45
        })
      });
    }
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-notes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeboardNoteLayerComponent extends NoteLayerComponent {
  @Input() notes: Array<[string, SKNote, boolean]> = [];

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    super(changeDetectorRef, mapComponent);
  }

  parseNotes(notes: Array<[string, SKNote, boolean]> = this.notes) {
    const fa: Feature[] = [];
    for (const w of notes) {
      if (!w[1].position) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat([w[1].position.longitude, w[1].position.latitude])
        ),
        name: w[1].name
      });
      f.setId('note.' + w[0]);
      f.setStyle(this.buildStyle(w[0], w[1]));
      fa.push(f);
    }
    this.features = fa;
  }
}
