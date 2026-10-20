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
 * length when that is larger than the selected icon size. Each axis follows
 * the reported beam/length aspect ratio; when both dimensions are known a
 * single multiplier keeps the whole icon at least as large as the selected
 * size, so the vessel stays visible when zoomed out without changing shape.
 * A missing dimension leaves that axis at the selected icon scale.
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
  let widthScale = beam ? (beam * pixelsPerMetre) / metrics.width : null;
  let heightScale = length ? (length * pixelsPerMetre) / metrics.height : null;

  if (widthScale === null || heightScale === null) {
    return [
      widthScale === null ? selectedScale : Math.max(selectedScale, widthScale),
      heightScale === null
        ? selectedScale
        : Math.max(selectedScale, heightScale)
    ];
  }

  const largestPixelDimension = Math.max(
    metrics.width * widthScale,
    metrics.height * heightScale
  );
  const minimumPixelDimension =
    Math.max(metrics.width, metrics.height) * selectedScale;
  const multiplier = Math.max(1, minimumPixelDimension / largestPixelDimension);

  widthScale *= multiplier;
  heightScale *= multiplier;
  return [widthScale, heightScale];
}
