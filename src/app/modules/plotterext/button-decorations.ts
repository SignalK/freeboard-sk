import type {
  ButtonColors,
  ButtonStyle,
  DecorateButtonsParams
} from 'signalk-plotterext-bus/host';
import type { ToolbarItem } from 'src/app/lib/components/map-toolbar/map-toolbar';

export const BUTTON_STYLES: readonly ButtonStyle[] = [
  'normal',
  'active',
  'warning',
  'alarm'
];

export const BUTTON_COLOR_PATTERN = '^#[0-9a-fA-F]{6}$';
const BUTTON_COLOR = new RegExp(BUTTON_COLOR_PATTERN);

/** A button's decorations as drawn. */
export interface ButtonDecoration {
  style: ButtonStyle;
  colors?: ButtonColors;
  badge: number;
}

/**
 * `buttons.decorate` choices for one button. A key that is present overrides
 * the manifest; `colors: {}` means the style's colours even where the manifest
 * sets custom ones.
 */
export type DecorationOverride = {
  style?: ButtonStyle;
  colors?: ButtonColors;
  badge?: number;
};

/** The decoration fields of a button's manifest entry, unchecked JSON. */
export interface ManifestDecoration {
  style?: unknown;
  colors?: unknown;
  badge?: unknown;
}

function isStyle(value: unknown): value is ButtonStyle {
  return BUTTON_STYLES.includes(value as ButtonStyle);
}

function isBadge(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

/** The valid colours of `value`, or `undefined` when it has none. */
function validColors(value: unknown): ButtonColors | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result: ButtonColors = {};
  for (const key of ['fg', 'bg'] as const) {
    const color = (value as Record<string, unknown>)[key];
    if (typeof color === 'string' && BUTTON_COLOR.test(color)) {
      result[key] = color;
    }
  }
  return result.fg || result.bg ? result : undefined;
}

/**
 * The decoration a button is drawn with: its `buttons.decorate` choices over
 * its manifest values. An invalid manifest value is ignored, as though unset.
 */
export function resolveDecoration(
  manifest: ManifestDecoration,
  override: DecorationOverride = {}
): ButtonDecoration {
  const style =
    override.style ?? (isStyle(manifest.style) ? manifest.style : 'normal');
  const badge =
    override.badge ?? (isBadge(manifest.badge) ? manifest.badge : 0);
  const colors = validColors(
    'colors' in override ? override.colors : manifest.colors
  );
  return colors ? { style, colors, badge } : { style, badge };
}

/**
 * Applies a `buttons.decorate` call to a button's choices: a decoration left
 * out is unchanged, `null` drops the choice so the manifest value shows again,
 * and `colors` is replaced as a whole.
 */
export function applyDecorate(
  current: DecorationOverride,
  params: Omit<DecorateButtonsParams, 'ids'>
): DecorationOverride {
  const next: DecorationOverride = { ...current };
  for (const key of ['style', 'colors', 'badge'] as const) {
    const value = params[key];
    if (value === undefined) continue;
    if (value === null) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

/** The toolbar fields that draw a decoration. */
export function decorationToolbarFields(
  decoration: ButtonDecoration
): Pick<ToolbarItem, 'active' | 'tone' | 'pressed' | 'badge' | 'colors'> {
  const { style, colors, badge } = decoration;
  return {
    ...(style === 'active' ? { active: true, pressed: true } : {}),
    ...(style === 'warning' || style === 'alarm' ? { tone: style } : {}),
    ...(colors ? { colors } : {}),
    ...(badge ? { badge } : {})
  };
}
