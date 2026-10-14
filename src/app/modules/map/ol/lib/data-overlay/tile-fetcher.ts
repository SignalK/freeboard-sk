import type { DataOverlayModel } from 'src/app/modules/plotterext/data-overlay-model';
import {
  expandTileUrl,
  type SourcePlan
} from 'src/app/modules/plotterext/data-overlay-style';

type TiledPlan = Extract<SourcePlan, { tiles: string[] }>;

/** Tiles of one source kept in memory, so a re-render does not refetch them. */
const MEMO_SIZE = 256;

/**
 * Fetches the tiles of one tiled source of a data overlay, shared by every
 * map layer drawing it.
 *
 * Tiles are fetched with `fetch`, not `<img>`, so the host controls
 * credentials (sent only to the Signal K server) and the HTTP cache: a tile
 * the extension refreshed is fetched with `cache: 'reload'`. Fetched tiles are
 * kept in a small in-memory cache, so refreshing some tiles can re-render the
 * layer (which asks for every visible tile again) while fetching only those.
 */
export class TileFetcher {
  private readonly memo = new Map<string, Blob | null>();
  private readonly inflight = new Map<string, Promise<Blob | null>>();
  /** Bumped by {@link invalidate} (all tiles, and per tile), so a fetch begun before it is not memoised. */
  private generation = 0;
  private readonly tileGeneration = new Map<string, number>();

  constructor(
    private readonly model: DataOverlayModel,
    private readonly sourceId: string,
    private readonly plan: TiledPlan
  ) {}

  /**
   * The bytes of a tile, or null for a tile with no data: outside the
   * source's bounds, or answered 404 or 204. Throws on any other failure.
   */
  async fetch(z: number, x: number, y: number): Promise<Blob | null> {
    const key = `${z}/${x}/${y}`;
    if (this.memo.has(key)) {
      const blob = this.memo.get(key) as Blob | null;
      // most recently used last
      this.memo.delete(key);
      this.memo.set(key, blob);
      return blob;
    }
    let pending = this.inflight.get(key);
    if (!pending) {
      const p = this.load(z, x, y).finally(() => {
        if (this.inflight.get(key) === p) this.inflight.delete(key);
      });
      this.inflight.set(key, p);
      pending = p;
    }
    return pending;
  }

  private async load(z: number, x: number, y: number): Promise<Blob | null> {
    const key = `${z}/${x}/${y}`;
    const generation = this.generationOf(key);
    let blob: Blob | null = null;
    if (this.inBounds(z, x, y)) {
      const reload = this.model.needsReload(this.sourceId, z, x, y);
      const templates = this.plan.tiles;
      const url = expandTileUrl(templates[(x + y) % templates.length], z, x, y);
      const res = await fetch(url, {
        credentials: this.plan.credentials,
        cache: reload ? 'reload' : 'default'
      });
      if (res.status !== 404 && res.status !== 204) {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        blob = await res.blob();
      }
    }
    // a refresh that arrived meanwhile wants a newer copy than this one
    if (generation === this.generationOf(key)) {
      this.model.markLoaded(this.sourceId, z, x, y);
      this.memo.set(key, blob);
      if (this.memo.size > MEMO_SIZE) {
        this.memo.delete(this.memo.keys().next().value as string);
      }
    }
    return blob;
  }

  /** Forget the listed tiles (`z/x/y`), or every tile, so they are fetched again. */
  invalidate(tiles?: [number, number, number][]) {
    if (!tiles) {
      this.generation++;
      this.tileGeneration.clear();
      this.inflight.clear();
      this.memo.clear();
      return;
    }
    for (const [z, x, y] of tiles) {
      const key = `${z}/${x}/${y}`;
      this.tileGeneration.set(key, (this.tileGeneration.get(key) ?? 0) + 1);
      this.inflight.delete(key);
      this.memo.delete(key);
    }
  }

  private generationOf(key: string): string {
    return `${this.generation}.${this.tileGeneration.get(key) ?? 0}`;
  }

  private inBounds(z: number, x: number, y: number): boolean {
    const b = this.plan.bounds;
    if (!b) return true;
    const n = 2 ** z;
    const lon = (i: number) => (i / n) * 360 - 180;
    const lat = (j: number) =>
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * j) / n))) * 180) / Math.PI;
    const [w, s, e, nth] = b;
    return !(lon(x + 1) < w || lon(x) > e || lat(y) < s || lat(y + 1) > nth);
  }
}
