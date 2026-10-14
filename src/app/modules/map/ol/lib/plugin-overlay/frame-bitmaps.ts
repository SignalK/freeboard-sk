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
 * The frame bitmaps an overlay layer holds: the newest, and the one each of its
 * renderers is drawing. OL keeps drawing the previous image until a new source
 * has loaded, and loads only while it renders the layer — not while the layer
 * is hidden, during a gesture, or with the tab in the background — so release
 * must follow what the renderers actually draw, not the load. There can be more
 * than one renderer (a twin of the layer on the split view's second pane, mid
 * gesture while the main chart has moved on), and a bitmap is closed only once
 * none of them draws it. A held bitmap no renderer picked up was never drawn,
 * so it is safe to close at any time.
 *
 * A closed bitmap is not an error to OL: it is 0 × 0 pixels, so a renderer
 * still holding one silently draws nothing.
 */
export class FrameBitmaps {
  private held: ImageBitmap[] = [];
  private newest: ImageBitmap | null = null;

  /** Number of bitmaps currently held (open). */
  get size(): number {
    return this.held.length;
  }

  /**
   * A new frame is about to be shown. `drawn` is what each renderer draws now
   * (null for nothing); every other held bitmap is closed.
   */
  add(image: ImageBitmap, drawn: readonly unknown[]) {
    this.keepOnly(drawn);
    this.held.push(image);
    this.newest = image;
  }

  /**
   * A renderer drew the layer; `drawn` is what each renderer draws now. A held
   * bitmap that is neither the newest nor drawn by any of them can never be
   * drawn again.
   */
  rendered(drawn: readonly unknown[]) {
    if (this.newest) {
      this.keepOnly([this.newest, ...drawn]);
    }
  }

  /** Close everything (the layer is going away). */
  clear() {
    this.keepOnly([]);
    this.newest = null;
  }

  private keepOnly(keep: readonly unknown[]) {
    for (const b of this.held) {
      if (!keep.includes(b)) b.close();
    }
    this.held = this.held.filter((b) => keep.includes(b));
  }
}
