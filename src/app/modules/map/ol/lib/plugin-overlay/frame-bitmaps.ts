import ImageSource from 'ol/source/Image';
import { createLoader } from 'ol/source/static';
import type { ProjectionLike } from 'ol/proj';

/**
 * A static `ImageSource` showing one overlay frame: the transferred
 * `ImageBitmap` itself (no copy), placed at `extent`. One source per frame,
 * because a static source computes its resolution once, on first load, and
 * `refresh()` never reloads it — a long-lived source with a mutable extent
 * would place a frame drawn at another zoom at the old scale.
 */
export function frameSource(
  image: ImageBitmap,
  extent: number[],
  projection: ProjectionLike
): ImageSource {
  return new ImageSource({
    projection,
    loader: createLoader({
      imageExtent: extent.slice(),
      url: '',
      load: () => Promise.resolve(image)
    })
  });
}

/**
 * The frame bitmaps an overlay layer holds, kept to at most two: the one OL's
 * renderer is drawing and the newest. OL keeps drawing the previous image until
 * a new source has loaded, and loads only while it renders the layer — not
 * while the layer is hidden, during a gesture, or with the tab in the
 * background — so release must follow what the renderer actually draws, not
 * the load. A held bitmap the renderer never picked up was never drawn, so it
 * is safe to close at any time.
 */
export class FrameBitmaps {
  private held: ImageBitmap[] = [];
  private newest: ImageBitmap | null = null;

  /** Number of bitmaps currently held (open). */
  get size(): number {
    return this.held.length;
  }

  /**
   * A new frame is about to be shown. `drawn` is what the renderer draws now
   * (null for nothing); every other held bitmap is closed.
   */
  add(image: ImageBitmap, drawn: unknown) {
    this.keepOnly(drawn);
    this.held.push(image);
    this.newest = image;
  }

  /**
   * The layer rendered with `drawn`. Once that is the newest frame, nothing
   * older can be drawn again.
   */
  rendered(drawn: unknown) {
    if (this.newest && drawn === this.newest && this.held.length > 1) {
      this.keepOnly(drawn);
    }
  }

  /** Close everything (the layer is going away). */
  clear() {
    this.keepOnly(null);
    this.newest = null;
  }

  private keepOnly(keep: unknown) {
    for (const b of this.held) {
      if (b !== keep) b.close();
    }
    this.held = this.held.filter((b) => b === keep);
  }
}
