import { MatMenuPanel } from '@angular/material/menu';

/** Vertical distance between toolbar buttons: a 40 px FAB in a 48 px item with 5 px padding above and below. */
export const TOOLBAR_ITEM_PITCH = 58;

export type ToolbarTone = 'warning' | 'alarm';

export interface ToolbarColors {
  fg?: string;
  bg?: string;
}

/** One button on a map toolbar, shown either as a button or as an overflow menu entry. */
export interface ToolbarItem {
  id: string;
  /** Material icon ligature. Ignored when `svgIcon` is set. */
  icon?: string;
  svgIcon?: string;
  /** Extra classes for the icon, e.g. `ob` for the IEC symbol set. */
  iconClass?: string;
  /** Shown as the button's tooltip, and as its label in the overflow menu. */
  tooltip: string;
  /** Button colour class. When omitted, `tone`, then `active`, picks it. */
  buttonClass?: string;
  /** An engaged mode or pending indicator. A hidden active item puts a dot on the overflow button. */
  active?: boolean;
  /**
   * Something needs the user's attention: drawn in the warning (`button-accent`)
   * or alarm (`button-warn`) colours. A hidden item with a tone puts a dot on
   * the overflow button.
   */
  tone?: ToolbarTone;
  /** `#rrggbb` colours drawn over those of the button's class; one left out keeps the class's. */
  colors?: ToolbarColors;
  /** Exposed as `aria-pressed`: the button is a toggle that is switched on. */
  pressed?: boolean;
  disabled?: boolean;
  /** Count shown on the button. A hidden item with a badge puts a dot on the overflow button. */
  badge?: number;
  /** Opens this menu (a submenu when the item is in the overflow menu). */
  menu?: MatMenuPanel;
  action?: () => void;
  /**
   * This item is the toolbar's overflow menu. It takes the last visible slot
   * when the toolbar overflows, and the hidden items go at the top of its menu.
   * Without one, the toolbar adds its own overflow button.
   */
  overflowAnchor?: boolean;
}

export interface ToolbarSplit<T> {
  /** Items shown as buttons, excluding the overflow anchor once the toolbar has overflowed. */
  shown: T[];
  /** Items that did not fit, in toolbar order. */
  overflow: T[];
  overflowed: boolean;
}

/** How many buttons fit in a toolbar whose content box is `height` px tall. */
export function toolbarSlots(height: number): number {
  return Math.max(0, Math.floor(height / TOOLBAR_ITEM_PITCH));
}

/**
 * Splits toolbar items between the buttons that fit in `slots` and an overflow
 * menu. The order never changes: when the items don't all fit, the first
 * `slots - 1` are shown and the last slot goes to the overflow button.
 */
export function splitToolbar<T>(
  items: readonly T[],
  slots: number,
  isAnchor: (item: T) => boolean = () => false
): ToolbarSplit<T> {
  if (items.length <= slots) {
    return { shown: [...items], overflow: [], overflowed: false };
  }
  const rest = items.filter((item) => !isAnchor(item));
  const keep = Math.max(0, slots - 1);
  return {
    shown: rest.slice(0, keep),
    overflow: rest.slice(keep),
    overflowed: true
  };
}

const COMPARED_KEYS = [
  'id',
  'icon',
  'svgIcon',
  'iconClass',
  'tooltip',
  'buttonClass',
  'active',
  'tone',
  'pressed',
  'disabled',
  'badge',
  'menu',
  'overflowAnchor'
] as const;

/**
 * Whether two item lists render the same, ignoring `action`. The host builds
 * a fresh list with fresh closures on every change detection pass; comparing
 * them by value stops that from re-rendering (or re-triggering) anything
 * reading the split.
 */
export function sameToolbarItems(
  a: readonly ToolbarItem[],
  b: readonly ToolbarItem[]
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, i) =>
        COMPARED_KEYS.every((k) => item[k] === b[i][k]) &&
        item.colors?.fg === b[i].colors?.fg &&
        item.colors?.bg === b[i].colors?.bg
    )
  );
}

/** Whether a hidden item needs the overflow button to show a dot. */
export function needsAttention(item: ToolbarItem): boolean {
  return !!item.active || !!item.badge || !!item.tone;
}

/** The badge as drawn on the button: a count over 99 does not fit, so it shows as `99+`. */
export function toolbarBadgeText(item: ToolbarItem): string {
  if (!item.badge) return '';
  return item.badge > 99 ? '99+' : String(item.badge);
}

/** An overflow menu entry's text: the tooltip, plus the badge count if any. */
export function toolbarMenuLabel(item: ToolbarItem): string {
  return item.badge ? `${item.tooltip} (${item.badge})` : item.tooltip;
}
