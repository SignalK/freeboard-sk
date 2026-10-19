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
 * Scale for the own-vessel icon so it is drawn at the vessel's reported size,
 * while never becoming smaller than the icon scale the user selected.
 *
 * The vessel's length sets the icon's vertical size and its beam the horizontal
 * size. When only one dimension is known the icon's own aspect ratio supplies
 * the other, and when neither is known the selected scale is returned unchanged.
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
  const aspect = metrics.width / metrics.height;
  let actualWidth = beam ? beam * pixelsPerMetre : null;
  let actualHeight = length ? length * pixelsPerMetre : null;

  if (actualWidth === null && actualHeight !== null) {
    actualWidth = actualHeight * aspect;
  }
  if (actualHeight === null && actualWidth !== null) {
    actualHeight = actualWidth / aspect;
  }

  const width = Math.max(metrics.width * selectedScale, actualWidth);
  const height = Math.max(metrics.height * selectedScale, actualHeight);
  return [width / metrics.width, height / metrics.height];
}
