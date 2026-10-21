import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Map as OlMap } from 'ol';
import Overlay, { Options, PanIntoViewOptions } from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import { Subject } from 'rxjs';
import { MapComponent } from './map.component';
import { Coordinate } from './models';

@Component({
  selector: 'ol-map > ol-overlay',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class OverlayComponent implements OnInit, OnChanges, OnDestroy {
  protected overlay?: Overlay;
  public element?: HTMLElement;

  @Input() id?: number | string;
  @Input() className?: string;
  @Input() offset?: number[];
  @Input() position?: Coordinate;
  /**
   * Render-space offset (EPSG:3857 metres) of the world copy to draw this
   * overlay in. `position` is canonical lon/lat; this shifts only the drawn
   * Mercator position so the overlay appears in the world copy the user is
   * looking at. Defaults to the primary world.
   */
  @Input() worldOffset = 0;
  @Input() positioning?: string;
  @Input() stopEvent?: boolean;
  @Input() insertFirst?: boolean;
  /**
   * The map to show the overlay on, when not the one it is declared in: a
   * popover for a tap on the split view's second pane opens in that pane.
   */
  @Input() targetMap: OlMap | undefined;

  /**
   * Emits when the overlay may have moved on screen: after it is moved to a
   * new anchor position, and after the map finishes a pan, zoom or resize.
   * Content that depends on where it sits (a popover choosing to open above
   * or below) re-measures on it.
   */
  readonly repositioned = new Subject<void>();
  private moveEndKey?: EventsKey;
  private shownOn?: OlMap;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected elementRef: ElementRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  // Project a canonical lon/lat to its Mercator position in the target world copy.
  private toWorldPosition(position: Coordinate): number[] {
    const merc = fromLonLat(position);
    return this.worldOffset ? [merc[0] + this.worldOffset, merc[1]] : merc;
  }

  ngOnInit() {
    if (this.elementRef.nativeElement) {
      this.element = this.elementRef.nativeElement;
      const overlay = new Overlay(this as Options);
      this.overlay = overlay;
      const map = this.targetMap ?? this.mapComponent.getMap();
      if (map) {
        this.showOn(overlay, map);
      }
      if (this.position) {
        overlay.setPosition(this.toWorldPosition(this.position));
      }
    }
  }

  ngOnDestroy() {
    if (this.moveEndKey) {
      unByKey(this.moveEndKey);
    }
    this.repositioned.complete();
    if (this.overlay) {
      this.shownOn?.removeOverlay(this.overlay);
      this.overlay = undefined;
    }
  }

  private showOn(overlay: Overlay, map: OlMap) {
    if (this.moveEndKey) {
      unByKey(this.moveEndKey);
    }
    this.shownOn?.removeOverlay(overlay);
    this.shownOn = map;
    map.addOverlay(overlay);
    // moveend is dispatched before postrender, and the overlay only moves
    // to its new screen position on postrender, so signal after that.
    this.moveEndKey = map.on('moveend', () =>
      map.once('postrender', () => this.repositioned.next())
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.overlay && changes.targetMap) {
      const map = this.targetMap ?? this.mapComponent.getMap();
      if (map && map !== this.shownOn) {
        this.showOn(this.overlay, map);
        this.repositioned.next();
      }
    }
    // Re-place on a change to either the canonical position or the target world.
    if (this.overlay && (changes.position || changes.worldOffset)) {
      if (this.position) {
        this.overlay.setPosition(this.toWorldPosition(this.position));
        this.repositioned.next();
      }
    }
  }

  panIntoView(panIntoViewOptions: PanIntoViewOptions) {
    this.overlay?.panIntoView(panIntoViewOptions);
  }
}
