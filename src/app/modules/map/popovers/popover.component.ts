/** popover Component **
 ************************/

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ElementRef,
  DestroyRef,
  ViewChild,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CountryFlagComponent } from 'src/app/lib/components/country-flags.component';
import { AppFacade } from 'src/app/app.facade';
import { OverlayComponent } from '../ol/lib/overlay.component';
import { PopoverPlacement, choosePopoverPlacement } from './popover-placement';

/*********** Popover ***************
title: string -  title text,
canClose: boolean - show close button
measure: boolean= measure mode;
***********************************/
@Component({
  selector: 'ap-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CountryFlagComponent
  ],
  template: `
    <div
      #box
      class="popover in mat-app-background"
      [class.top]="placement() === 'top'"
      [class.bottom]="placement() === 'bottom'"
      [ngClass]="{ measure: measure, compact: compact, docked: docked }"
    >
      @if (title || icon || mmsi || canClose || navTo) {
        <div class="popover-title">
          <div
            [ngClass]="{ measure: measure }"
            style="flex: 1 1 auto;overflow: hidden;
                                  display: -webkit-box;
                                  -webkit-box-orient: vertical;
                                  -webkit-line-clamp: 1;
                                  line-clamp: 1;
                                  text-overflow:ellipsis;"
          >
            @if (mmsi) {
              <mat-icon>
                <country-flag
                  [mmsi]="mmsi"
                  [host]="app.hostDef.url"
                ></country-flag>
              </mat-icon>
            }

            @if (icon?.svgIcon) {
              <mat-icon
                [class]="icon?.class"
                [svgIcon]="icon.svgIcon"
              ></mat-icon>
            } @else if (icon?.name) {
              <mat-icon [class]="icon?.class">{{ icon?.name }}</mat-icon>
            }

            @if (title) {
              &nbsp;{{ title }}
            }
          </div>
          @if (canClose) {
            <div style="">
              <button mat-icon-button (click)="handleClose()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          @if (!canClose && navTo) {
            <div style="">
              <button
                mat-icon-button
                matTooltip="Navigate to here"
                (click)="handleNavTo()"
              >
                <mat-icon>near_me</mat-icon>
              </button>
            </div>
          }
        </div>
      }
      <div class="popover-content">
        <ng-content></ng-content>
      </div>

      <div class="arrow" style="left:50%;"></div>
    </div>
  `,
  styleUrls: ['./popover.component.scss']
})
export class PopoverComponent {
  @Input() title: string;
  @Input() mmsi: string;
  @Input() icon: { class: string; name?: string; svgIcon?: string };
  @Input() canClose = true;
  @Input() measure = false;
  @Input() compact = false;
  /** Render in place (no anchor arrow, static position) for use as a docked
   *  panel rather than a feature-anchored popover. */
  @Input() docked = false;
  @Input() navTo = false;
  @Output() closed: EventEmitter<void> = new EventEmitter();
  @Output() navigateTo: EventEmitter<void> = new EventEmitter();

  @ViewChild('box', { static: true }) private box: ElementRef<HTMLElement>;

  protected app = inject(AppFacade);

  /** Side of the anchor the popover opens on (#827). */
  protected placement = signal<PopoverPlacement>('top');

  private overlay = inject(OverlayComponent, { optional: true });
  private resizeObserver: ResizeObserver;

  constructor() {
    // Open below the anchor when there is no room above it, so the title bar
    // and close button stay on screen (see choosePopoverPlacement). Re-check when the content changes size,
    // when the popover is re-anchored to another feature, and when the map is
    // panned, zoomed or resized (e.g. a device rotated). Deliberately
    // not OpenLayers' autoPan: panning the chart to fit would fight Center &
    // Follow Vessel.
    afterNextRender(() => {
      this.updatePlacement();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.updatePlacement());
        this.resizeObserver.observe(this.box.nativeElement);
      }
    });
    this.overlay?.repositioned
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updatePlacement());
    inject(DestroyRef).onDestroy(() => this.resizeObserver?.disconnect());
  }

  /**
   * Measure the popover against its anchor and the visible map area, and pick
   * the side to open on. The anchor is the popover's offset parent: the
   * OpenLayers overlay container, whose top edge sits on the anchor point.
   *
   * A popover that fits on neither side is capped to the room it gets. The cap
   * is set on the element directly, not through a binding, so it can be lifted
   * and the natural height measured in the same synchronous pass: measuring
   * the capped height would make it "fit" and flip it back and forth.
   */
  protected updatePlacement() {
    const box = this.box?.nativeElement;
    const anchor = box?.offsetParent;
    if (this.docked || !anchor) {
      return;
    }
    box.style.maxHeight = '';
    const area = box.closest('.ol-viewport')?.getBoundingClientRect();
    const layout = choosePopoverPlacement({
      anchorY: anchor.getBoundingClientRect().top,
      height: box.getBoundingClientRect().height,
      top: Math.max(area?.top ?? 0, 0),
      bottom: Math.min(area?.bottom ?? window.innerHeight, window.innerHeight)
    });
    const capped = layout.maxHeight !== undefined;
    box.style.maxHeight = capped ? `${layout.maxHeight}px` : '';
    box.classList.toggle('capped', capped);
    this.placement.set(layout.placement);
  }

  handleClose() {
    this.closed.emit();
  }

  handleNavTo() {
    this.navigateTo.emit();
  }
}
