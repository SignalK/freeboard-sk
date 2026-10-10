import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  SimpleChanges
} from '@angular/core';
import { Feature, MapBrowserEvent } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import PointerInteraction from 'ol/interaction/Pointer';
import { Point } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { MapComponent } from '../map.component';
import { Coordinate } from '../models';
import { GuardZone } from 'src/app/modules/radar/guard-zones';
import {
  dragHandle,
  fromRadarPolar,
  handlePositions,
  normalizeAngle,
  RadarPolar,
  toRadarPolar,
  ZONE_HANDLES,
  ZoneHandle,
  zoneFromDrag
} from 'src/app/modules/radar/guard-zone-edit';
import { ZoneEdit } from 'src/app/modules/radar/guard-zone-edit.service';

// sized for a finger on a tablet
const HANDLE_RADIUS = 10;
const HANDLE_HIT_TOLERANCE = 12;
// a press that moves less than this is a tap, not a drawn zone
const MIN_DRAW_PIXELS = 8;

const HANDLE_STYLE = new Style({
  image: new Circle({
    radius: HANDLE_RADIUS,
    fill: new Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
    stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.8)', width: 2 })
  })
});

/** A map coordinate as canonical [lon, lat]: the pointer may be over any
 *  world copy, the zone maths needs the one longitude. */
function pointerLonLat(coordinate: number[]): number[] {
  const [lon, lat] = toLonLat(coordinate);
  return [normalizeAngle((lon * Math.PI) / 180) * (180 / Math.PI), lat];
}

function pointerIdOf(e: MapBrowserEvent): number {
  return (e.originalEvent as PointerEvent).pointerId;
}

// ** Freeboard radar guard zone editor component **
// Draws a zone by dragging from one corner to the opposite one, and edits it
// through handles for each bearing and each distance, as in the MaYaRa radar
// GUI.
@Component({
  selector: 'ol-map > fb-radar-zone-editor',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RadarZoneEditorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() edit: ZoneEdit | undefined;
  @Input() position: Coordinate;
  /** vessel heading, radians true: zone bearings are relative to the bow */
  @Input() heading = 0;
  @Input() zIndex: number;

  /** the zone while it is drawn or a handle is dragged */
  zoneChange = output<GuardZone>();
  /** a zone drawn from corner to corner */
  zoneDrawn = output<GuardZone>();

  protected layer: VectorLayer<VectorSource>;
  protected source: VectorSource;
  private interaction: PointerInteraction;

  private drawStart: { polar: RadarPolar; pixel: number[] };
  private drawing: GuardZone;
  private dragging: ZoneHandle;
  private dragged: GuardZone;
  // the finger that started the gesture, and the zone it started from
  private pointerId: number;
  private original: GuardZone;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource({ features: this.buildHandles() });
    this.layer = new VectorLayer({ source: this.source, zIndex: this.zIndex });
    this.interaction = new PointerInteraction({
      handleDownEvent: (e) => this.onDown(e),
      handleDragEvent: (e) => this.onDrag(e),
      handleUpEvent: (e) => this.onUp(e)
    });
    const map = this.mapComponent.getMap();
    map?.addLayer(this.layer);
    map?.addInteraction(this.interaction);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.layer) {
      return;
    }
    if (changes['zIndex']) {
      this.layer.setZIndex(this.zIndex);
    }
    if (changes['edit'] || changes['position'] || changes['heading']) {
      this.source.clear();
      this.source.addFeatures(this.buildHandles());
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    map?.removeInteraction(this.interaction);
    map?.removeLayer(this.layer);
    this.layer = null;
  }

  private polarAt(e: MapBrowserEvent): RadarPolar {
    return toRadarPolar(
      this.position,
      this.heading ?? 0,
      pointerLonLat(e.coordinate)
    );
  }

  private onDown(e: MapBrowserEvent): boolean {
    if (!this.edit || !Array.isArray(this.position)) {
      return false;
    }
    this.pointerId = pointerIdOf(e);
    this.original = this.edit.zone;
    if (this.edit.mode === 'draw') {
      this.drawStart = { polar: this.polarAt(e), pixel: e.pixel };
      this.drawing = undefined;
      return true;
    }
    const handle = e.map.forEachFeatureAtPixel(
      e.pixel,
      (f) => f.get('handle') as ZoneHandle,
      {
        layerFilter: (l) => l === this.layer,
        hitTolerance: HANDLE_HIT_TOLERANCE
      }
    );
    if (handle && this.edit.zone) {
      this.dragging = handle;
      this.dragged = this.edit.zone;
      return true;
    }
    return false;
  }

  private onDrag(e: MapBrowserEvent) {
    if (pointerIdOf(e) !== this.pointerId) {
      this.abort();
      return;
    }
    if (this.drawStart) {
      const [x0, y0] = this.drawStart.pixel;
      if (
        !this.drawing &&
        Math.hypot(e.pixel[0] - x0, e.pixel[1] - y0) < MIN_DRAW_PIXELS
      ) {
        return;
      }
      this.drawing = zoneFromDrag(this.drawStart.polar, this.polarAt(e));
      this.zoneChange.emit(this.drawing);
    } else if (this.dragging) {
      this.dragged = dragHandle(this.dragged, this.dragging, this.polarAt(e));
      this.zoneChange.emit(this.dragged);
    }
  }

  private onUp(e: MapBrowserEvent): boolean {
    if (pointerIdOf(e) !== this.pointerId) {
      this.abort();
    } else if (this.drawing) {
      this.zoneDrawn.emit(this.drawing);
    }
    this.reset();
    return false;
  }

  /** A second finger means a pinch or a slip, not the shape the user meant:
   *  the zone goes back to where the gesture started. */
  private abort() {
    if (this.drawing || this.dragging) {
      this.zoneChange.emit(this.original);
    }
    this.reset();
  }

  private reset() {
    this.drawStart = undefined;
    this.drawing = undefined;
    this.dragging = undefined;
    this.dragged = undefined;
  }

  private buildHandles(): Feature[] {
    const zone = this.edit?.zone;
    if (this.edit?.mode !== 'edit' || !zone || !Array.isArray(this.position)) {
      return [];
    }
    const at = handlePositions(zone);
    return ZONE_HANDLES.map((handle) => {
      const f = new Feature({
        geometry: new Point(
          fromLonLat(
            fromRadarPolar(this.position, this.heading ?? 0, at[handle])
          )
        ),
        handle
      });
      f.setStyle(HANDLE_STYLE);
      return f;
    });
  }
}
