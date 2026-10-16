import { describe, expect, it, vi } from 'vitest';
import { get as getProjection } from 'ol/proj';
import { FrameBitmaps, frameSource } from './frame-bitmaps';

const bitmap = (width = 100, height = 50) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

describe('FrameBitmaps', () => {
  it('holds one bitmap while the renderer draws nothing (layer hidden, tab in background)', () => {
    const b = new FrameBitmaps();
    const frames = [bitmap(), bitmap(), bitmap(), bitmap(), bitmap()];
    frames.forEach((f) => b.add(f, [null]));
    expect(b.size).toBe(1);
    frames.slice(0, 4).forEach((f) => expect(f.close).toHaveBeenCalled());
    expect(frames[4].close).not.toHaveBeenCalled();
  });

  it('keeps the bitmap the renderer is drawing, plus the newest, during a gesture', () => {
    const b = new FrameBitmaps();
    const [a, x, y] = [bitmap(), bitmap(), bitmap()];
    b.add(a, [null]);
    // the renderer shows A; new frames arrive before any of them loads
    b.add(x, [a]);
    b.add(y, [a]);
    expect(a.close).not.toHaveBeenCalled();
    expect(x.close).toHaveBeenCalled(); // never drawn
    expect(b.size).toBe(2);
    // a render that still draws A releases nothing
    b.rendered([a]);
    expect(a.close).not.toHaveBeenCalled();
    // once the newest is on screen, A can go
    b.rendered([y]);
    expect(a.close).toHaveBeenCalled();
    expect(y.close).not.toHaveBeenCalled();
    expect(b.size).toBe(1);
  });

  it('keeps a bitmap open while any renderer still draws it', () => {
    // The main chart moves on to each new frame; a twin on the second pane,
    // mid gesture, keeps drawing A.
    const b = new FrameBitmaps();
    const [a, x, y] = [bitmap(), bitmap(), bitmap()];
    b.add(a, [null, null]);
    b.rendered([a, a]);
    b.add(x, [a, a]);
    b.rendered([x, a]);
    b.add(y, [x, a]);
    b.rendered([y, a]);

    expect(a.close).not.toHaveBeenCalled();
    expect(x.close).toHaveBeenCalled(); // no renderer draws it any more
    expect(b.size).toBe(2);

    // the gesture ends and the twin catches up
    b.rendered([y, y]);
    expect(a.close).toHaveBeenCalled();
    expect(y.close).not.toHaveBeenCalled();
    expect(b.size).toBe(1);
  });

  it('holds at most the newest plus one bitmap per renderer', () => {
    const b = new FrameBitmaps();
    const [a, x] = [bitmap(), bitmap()];
    b.add(a, [null, null]);
    b.add(x, [a, null]);
    // each renderer is behind on a different frame
    const frames = [bitmap(), bitmap(), bitmap()];
    frames.forEach((f) => b.add(f, [x, a]));

    expect(b.size).toBe(3);
    expect(a.close).not.toHaveBeenCalled();
    expect(x.close).not.toHaveBeenCalled();
    frames.slice(0, 2).forEach((f) => expect(f.close).toHaveBeenCalled());
  });

  it('closes everything on clear', () => {
    const b = new FrameBitmaps();
    const [a, c] = [bitmap(), bitmap()];
    b.add(a, [null]);
    b.add(c, [a]);
    b.clear();
    expect(a.close).toHaveBeenCalled();
    expect(c.close).toHaveBeenCalled();
    expect(b.size).toBe(0);
  });
});

describe('frameSource', () => {
  async function loadedResolution(extent: number[]) {
    const projection = getProjection('EPSG:3857')!;
    const source = frameSource(bitmap(100, 50), extent, projection);
    const image = source.getImage(extent, 1, 1, projection)!;
    image.load();
    await new Promise((r) => setTimeout(r, 0));
    return image.getResolution();
  }

  it('places each frame at its own scale (a frame drawn at another zoom)', async () => {
    // the same 100x50 pixels covering 1 km, then 4 km
    expect(await loadedResolution([0, 0, 1000, 500])).toBe(10);
    expect(await loadedResolution([0, 0, 4000, 2000])).toBe(40);
  });

  it('copies the extent, so a caller reusing its array cannot move the frame', async () => {
    const projection = getProjection('EPSG:3857')!;
    const extent = [0, 0, 1000, 500];
    const source = frameSource(bitmap(100, 50), extent, projection);
    extent[2] = 9999;
    const image = source.getImage([0, 0, 1000, 500], 1, 1, projection)!;
    image.load();
    await new Promise((r) => setTimeout(r, 0));
    expect(image.getExtent()).toEqual([0, 0, 1000, 500]);
  });
});
