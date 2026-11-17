// Named widget layouts, kept per server (per boat) as the `freeboardLayouts`
// resource type. Serving them through the Resources API makes the server send
// a `resources.freeboardLayouts.<id>` delta on every save and delete, which is
// how a screen showing a layout learns another screen changed it.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ServerAPI } from '@signalk/server-api';

export const LAYOUTS_RESOURCE_TYPE = 'freeboardLayouts';

/** A saved layout, as stored and as served. */
export interface StoredLayout {
  name: string;
  widgets: unknown[];
  instances: Record<string, unknown>;
  /** Raised on every save, so a screen can tell its copy is out of date. */
  revision: number;
  updated: string;
}

// a layout id becomes a file name
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Checks a layout sent for saving. `baseRevision`, when sent, is the revision
 * the sender's copy came from: a save made from an older copy than the one
 * stored is refused, so it can't silently undo another screen's save.
 */
function parseSave(value: Record<string, unknown>): {
  name: string;
  widgets: unknown[];
  instances: Record<string, unknown>;
  baseRevision?: number;
} {
  const { name, widgets, instances, baseRevision } = value;
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('A layout needs a name');
  }
  if (!Array.isArray(widgets)) {
    throw new Error('A layout needs a widgets list');
  }
  if (instances !== undefined && !isObject(instances)) {
    throw new Error('Layout instances must be an object');
  }
  if (baseRevision !== undefined && typeof baseRevision !== 'number') {
    throw new Error('baseRevision must be a number');
  }
  return {
    name: name.trim(),
    widgets,
    instances: instances ?? {},
    baseRevision
  };
}

export class LayoutStore {
  // one write at a time, so the revision check and the write can't interleave
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dir: string) {}

  private file(id: string): string {
    if (!SAFE_ID.test(id)) {
      throw new Error(`Invalid layout id: ${id}`);
    }
    return path.join(this.dir, `${id}.json`);
  }

  private serialized<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async read(id: string): Promise<StoredLayout | undefined> {
    try {
      return JSON.parse(await fs.readFile(this.file(id), 'utf8'));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async list(): Promise<Record<string, StoredLayout>> {
    let names: string[];
    try {
      names = await fs.readdir(this.dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
    const result: Record<string, StoredLayout> = {};
    for (const name of names) {
      const id = name.endsWith('.json') ? name.slice(0, -5) : '';
      if (!SAFE_ID.test(id)) continue;
      try {
        const layout = await this.read(id);
        if (layout) result[id] = layout;
      } catch {
        // one unreadable file must not hide every other layout
      }
    }
    return result;
  }

  async get(id: string): Promise<StoredLayout> {
    const layout = await this.read(id);
    if (!layout) {
      throw new Error(`Layout ${id} not found`);
    }
    return layout;
  }

  async set(id: string, value: Record<string, unknown>): Promise<StoredLayout> {
    const file = this.file(id);
    const save = parseSave(value);
    return this.serialized(async () => {
      const current = await this.read(id);
      if (
        save.baseRevision !== undefined &&
        current &&
        current.revision !== save.baseRevision
      ) {
        throw new Error(
          `Layout ${id} is at revision ${current.revision}, not ${save.baseRevision}`
        );
      }
      const stored: StoredLayout = {
        name: save.name,
        widgets: save.widgets,
        instances: save.instances,
        revision: (current?.revision ?? 0) + 1,
        updated: new Date().toISOString()
      };
      await fs.mkdir(this.dir, { recursive: true });
      // write then rename, so a crash mid-write never leaves half a layout
      const temp = `${file}.tmp`;
      await fs.writeFile(temp, JSON.stringify(stored));
      await fs.rename(temp, file);
      return stored;
    });
  }

  async delete(id: string): Promise<void> {
    const file = this.file(id);
    return this.serialized(async () => {
      try {
        await fs.unlink(file);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    });
  }
}

/** Serve the layouts kept under `<plugin data dir>/layouts`. */
export function registerLayoutsProvider(server: ServerAPI): LayoutStore {
  const store = new LayoutStore(path.join(server.getDataDirPath(), 'layouts'));
  server.registerResourceProvider({
    type: LAYOUTS_RESOURCE_TYPE,
    methods: {
      listResources: () => store.list() as Promise<Record<string, unknown>>,
      getResource: (id: string) => store.get(id),
      setResource: async (id: string, value: Record<string, unknown>) => {
        await store.set(id, value);
      },
      deleteResource: (id: string) => store.delete(id)
    }
  });
  return store;
}
