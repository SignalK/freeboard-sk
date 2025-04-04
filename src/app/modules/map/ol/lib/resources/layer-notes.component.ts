import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Stroke, Fill, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBNotes, NoteResource, Notes } from 'src/app/types';
import { MapImageRegistry } from '../map-image-registry.service';
import { SKNote } from 'src/app/modules/skresources';

@Component({
  selector: 'ol-map > sk-notes-base',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class NotesBaseComponent extends FBFeatureLayerComponent {
  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['note'];
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'notes' in changes) {
      this.source.clear();
      this.parseNotes(changes['notes']);
    }
  }

  parseNotes(change: SimpleChange) {
    // overridable function
  }

  // build note feature style
  buildStyle(note: SKNote | NoteResource): Style {
    const icon = this.mapImages.getPOI(note.properties.skIcon ?? 'default');
    if (icon) {
      return new Style({
        image: icon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: -12
        })
      });
    } else {
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

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > sk-notes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class NoteLayerComponent extends NotesBaseComponent {
  @Input() notes: Notes;

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef, mapImages);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseSKNotes(this.notes);
  }

  override parseNotes(change: SimpleChange) {
    this.parseSKNotes(change.currentValue);
  }

  parseSKNotes(notes: Notes = this.notes) {
    const fa: Feature[] = [];
    for (const n in notes) {
      if (!notes[n].position) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat([notes[n].position.longitude, notes[n].position.latitude])
        ),
        name: notes[n].name
      });
      f.setId('note.' + n);
      f.set('icon', notes[n].properties?.skIcon ?? 'local_offer');
      f.setStyle(this.buildStyle(notes[n]).clone());
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }
}

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-notes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardNoteLayerComponent extends NotesBaseComponent {
  @Input() notes: FBNotes = [];

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef, mapImages);
  }

  ngOnInit() {
    super.ngOnInit();
    this.parseFBNotes(this.notes);
  }

  override parseNotes(change: SimpleChange) {
    this.parseFBNotes(change.currentValue);
  }

  parseFBNotes(notes: FBNotes = this.notes) {
    const fa: Feature[] = [];
    for (const n of notes) {
      if (!n[1].position) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat([n[1].position.longitude, n[1].position.latitude])
        ),
        name: n[1].name
      });
      f.setId('note.' + n[0]);
      f.set(
        'icon',
        n[1].properties?.skIcon
          ? `sk-${n[1].properties?.skIcon}`
          : 'local_offer'
      );
      f.setStyle(this.buildStyle(n[1]).clone());
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }
}
