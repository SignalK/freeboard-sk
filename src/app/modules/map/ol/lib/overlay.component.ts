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
import Overlay, { Options, PanIntoViewOptions } from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
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
  protected overlay: Overlay;
  public element: HTMLElement;

  @Input() id: number | string;
  @Input() className: string;
  @Input() offset: number[];
  @Input() position: Coordinate;
  /**
   * Render-space offset (EPSG:3857 metres) of the world copy to draw this
   * overlay in. `position` is canonical lon/lat; this shifts only the drawn
   * Mercator position so the overlay appears in the world copy the user is
   * looking at. Defaults to the primary world.
   */
  @Input() worldOffset = 0;
  @Input() positioning: string;
  @Input() stopEvent: boolean;
  @Input() insertFirst: boolean;

  /**
   * Emits after the overlay has been moved to a new anchor position, so
   * content that depends on where it sits on screen (a popover choosing to
   * open above or below) can re-measure.
   */
  readonly repositioned = new Subject<void>();

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
      this.overlay = new Overlay(this as Options);
      this.mapComponent.getMap().addOverlay(this.overlay);
      if (this.position) {
        this.overlay.setPosition(this.toWorldPosition(this.position));
      }
    }
  }

  ngOnDestroy() {
    this.repositioned.complete();
    if (this.overlay) {
      this.mapComponent.getMap().removeOverlay(this.overlay);
      this.overlay = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-place on a change to either the canonical position or the target world.
    if (this.overlay && (changes.position || changes.worldOffset)) {
      if (this.position) {
        this.overlay.setPosition(this.toWorldPosition(this.position));
        this.repositioned.next();
      }
    }
  }

  panIntoView(panIntoViewOptions: PanIntoViewOptions) {
    this.overlay.panIntoView(panIntoViewOptions);
  }
}
