/** Geometry needed to scale the own-vessel icon to its real dimensions. */
export interface VesselIconMetrics {
  width: number;
  height: number;
  scale: number;
}

export interface VesselDimensions {
  lengthOverall?: number | null;
  beam?: number | null;
}

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;

/**
 * Scale for the own-vessel icon so it fills the vessel's reported beam and
 * length. Each axis is scaled independently — the icon's own aspect ratio is
 * not used. A missing dimension leaves that axis at the selected icon scale.
 */
export function actualSizeIconScale(
  metrics: VesselIconMetrics,
  dimensions: VesselDimensions,
  metresPerPixel: number
): number | [number, number] {
  const selectedScale = Math.abs(metrics.scale);
  const mpp = positive(metresPerPixel);
  const length = positive(dimensions.lengthOverall);
  const beam = positive(dimensions.beam);

  if (!mpp || (!length && !beam)) {
    return selectedScale;
  }

  const pixelsPerMetre = 1 / mpp;
  const widthScale = beam
    ? (beam * pixelsPerMetre) / metrics.width
    : selectedScale;
  const heightScale = length
    ? (length * pixelsPerMetre) / metrics.height
    : selectedScale;

  return [widthScale, heightScale];
}
