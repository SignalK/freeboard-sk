import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ToolbarItem,
  ToolbarTone,
  needsAttention,
  sameToolbarItems,
  splitToolbar,
  toolbarBadgeText,
  toolbarButtonClass,
  toolbarMenuLabel,
  toolbarSlots
} from './map-toolbar';

// In the menu the icon shows the state that the button colour shows on the
// toolbar.
const TONE_ICON_CLASS: Record<ToolbarTone, string> = {
  warning: 'icon-accent',
  alarm: 'icon-warn'
};

/**
 * A column of map toolbar buttons that never scrolls. It shows as many items
 * as fit and moves the rest, in order, into an overflow menu: the anchor
 * item's menu when there is one (the host renders `overflow()` at its top),
 * otherwise a "…" button of its own.
 */
@Component({
  selector: 'fb-map-toolbar',
  imports: [
    NgTemplateOutlet,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  host: {
    '[class.left]': "side() === 'left'",
    '[class.right]': "side() === 'right'"
  },
  template: `
    @for (item of split().shown; track item.id) {
      <div class="toolbarItem">
        <ng-container
          *ngTemplateOutlet="button; context: { $implicit: item }"
        ></ng-container>
      </div>
    }
    @if (split().overflowed) {
      <div class="toolbarItem">
        @if (anchor(); as a) {
          <button
            mat-mini-fab
            [attr.data-toolbar-item]="a.id"
            [class]="buttonClass(a)"
            [disabled]="anchorDisabled()"
            [matTooltip]="a.tooltip"
            [attr.aria-label]="a.tooltip"
            [matTooltipPosition]="tooltipPosition()"
            [matMenuTriggerFor]="a.menu ?? null"
            matBadge="!"
            matBadgeSize="small"
            matBadgeOverlap="true"
            [matBadgeHidden]="!attention()"
            aria-hidden="false"
          >
            <ng-container
              *ngTemplateOutlet="icon; context: { $implicit: a }"
            ></ng-container>
          </button>
        } @else {
          <button
            class="button-toolbar"
            mat-mini-fab
            data-toolbar-item="overflow"
            matTooltip="More buttons"
            aria-label="More buttons"
            [matTooltipPosition]="tooltipPosition()"
            [matMenuTriggerFor]="overflowMenu"
            matBadge="!"
            matBadgeSize="small"
            matBadgeOverlap="true"
            [matBadgeHidden]="!attention()"
            aria-hidden="false"
          >
            <mat-icon>more_horiz</mat-icon>
          </button>
        }
      </div>
    }

    <mat-menu #overflowMenu="matMenu">
      @for (item of split().overflow; track item.id) {
        @if (item.menu) {
          <button
            mat-menu-item
            [disabled]="item.disabled"
            [matMenuTriggerFor]="item.menu"
          >
            <ng-container
              *ngTemplateOutlet="
                icon;
                context: { $implicit: item, inMenu: true }
              "
            ></ng-container>
            <span>{{ menuLabel(item) }}</span>
          </button>
        } @else {
          <button mat-menu-item [disabled]="item.disabled" (click)="run(item)">
            <ng-container
              *ngTemplateOutlet="
                icon;
                context: { $implicit: item, inMenu: true }
              "
            ></ng-container>
            <span>{{ menuLabel(item) }}</span>
          </button>
        }
      }
    </mat-menu>

    <ng-template #button let-item>
      @if (item.menu) {
        <button
          mat-mini-fab
          [attr.data-toolbar-item]="item.id"
          [class]="buttonClass(item)"
          [class.custom-bg]="!!item.colors?.bg"
          [class.custom-fg]="!!item.colors?.fg"
          [style.--toolbar-button-bg]="item.colors?.bg ?? null"
          [style.--toolbar-button-fg]="item.colors?.fg ?? null"
          [disabled]="item.disabled"
          [matTooltip]="item.tooltip"
          [attr.aria-label]="menuLabel(item)"
          [attr.aria-pressed]="item.pressed ? 'true' : null"
          [matTooltipPosition]="tooltipPosition()"
          [matMenuTriggerFor]="item.menu"
          [matBadge]="badgeText(item)"
          matBadgeOverlap="true"
          [matBadgeHidden]="!item.badge"
          aria-hidden="false"
        >
          <ng-container
            *ngTemplateOutlet="icon; context: { $implicit: item }"
          ></ng-container>
        </button>
      } @else {
        <button
          mat-mini-fab
          [attr.data-toolbar-item]="item.id"
          [class]="buttonClass(item)"
          [class.custom-bg]="!!item.colors?.bg"
          [class.custom-fg]="!!item.colors?.fg"
          [style.--toolbar-button-bg]="item.colors?.bg ?? null"
          [style.--toolbar-button-fg]="item.colors?.fg ?? null"
          [disabled]="item.disabled"
          [matTooltip]="item.tooltip"
          [attr.aria-label]="menuLabel(item)"
          [attr.aria-pressed]="item.pressed ? 'true' : null"
          [matTooltipPosition]="tooltipPosition()"
          [matBadge]="badgeText(item)"
          matBadgeOverlap="true"
          [matBadgeHidden]="!item.badge"
          aria-hidden="false"
          (click)="run(item)"
        >
          <ng-container
            *ngTemplateOutlet="icon; context: { $implicit: item }"
          ></ng-container>
        </button>
      }
    </ng-template>

    <!-- In the menu the icon shows the active state that the button colour
         shows on the toolbar. -->
    <ng-template #icon let-item let-inMenu="inMenu">
      @if (item.svgIcon) {
        <mat-icon
          [class]="iconClass(item, inMenu)"
          [svgIcon]="item.svgIcon"
        ></mat-icon>
      } @else {
        <mat-icon [class]="iconClass(item, inMenu)">{{ item.icon }}</mat-icon>
      }
    </ng-template>
  `,
  styles: [
    `
      :host {
        position: absolute;
        width: 50px;
        z-index: 4800;
        padding: 5px 2px 2px 2px;
        overflow: hidden;
        /* Always room for the overflow button, even when widgets squeeze the
           toolbar to nothing; it then overlaps the Action Button instead. */
        min-height: 58px;
      }
      :host(.left) {
        left: 0;
      }
      :host(.right) {
        right: 0;
      }
      /* Beat the theme's !important button classes; the colours come from
         the item through these properties. mfb-container draws an extension
         button the same way; keep the two in step. */
      .custom-bg {
        background-color: var(--toolbar-button-bg) !important;
      }
      .custom-fg {
        color: var(--toolbar-button-fg) !important;
      }
      .toolbarItem {
        text-align: center;
        height: 48px;
        padding: 5px 0;
      }
    `
  ]
})
export class MapToolbarComponent {
  readonly items = input.required<ToolbarItem[]>();
  readonly side = input<'left' | 'right'>('right');

  // Unmeasured (or no ResizeObserver) shows every item, as the toolbar did
  // before it could overflow.
  private readonly slots = signal(Number.POSITIVE_INFINITY);

  private readonly stableItems = computed(() => this.items(), {
    equal: sameToolbarItems
  });

  readonly split = computed(() =>
    splitToolbar(this.stableItems(), this.slots(), (i) => !!i.overflowAnchor)
  );

  /** Items that did not fit. A host with an anchor item renders these at the top of its menu. */
  readonly overflow = computed(() => this.split().overflow);

  protected readonly anchor = computed(() =>
    this.stableItems().find((i) => i.overflowAnchor)
  );

  protected readonly attention = computed(() =>
    this.split().overflow.some(needsAttention)
  );

  // A disabled anchor still opens while it holds an item that can be used,
  // so moving a button into the menu never makes it unreachable.
  protected readonly anchorDisabled = computed(
    () =>
      !!this.anchor()?.disabled &&
      this.split().overflow.every((i) => i.disabled)
  );

  protected readonly tooltipPosition = computed(() =>
    this.side() === 'left' ? 'right' : 'before'
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const height = entries[entries.length - 1].contentRect.height;
      this.slots.set(toolbarSlots(height));
    });
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  /** Runs the item's action, from the host's latest list so its closure is current. */
  run(item: ToolbarItem) {
    this.items()
      .find((i) => i.id === item.id)
      ?.action?.();
  }

  protected badgeText(item: ToolbarItem): string {
    return toolbarBadgeText(item);
  }

  protected menuLabel(item: ToolbarItem): string {
    return toolbarMenuLabel(item);
  }

  protected buttonClass(item: ToolbarItem): string {
    return toolbarButtonClass(item);
  }

  protected iconClass(item: ToolbarItem, inMenu: boolean): string {
    const state = item.tone
      ? TONE_ICON_CLASS[item.tone]
      : item.active
        ? 'icon-primary'
        : '';
    return [item.iconClass, inMenu ? state : ''].filter(Boolean).join(' ');
  }
}
