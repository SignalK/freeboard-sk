import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject, throwError } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';

import { AppFacade } from '../../app.facade';
import { defaultConfig } from '../../app.config';
import type { IAppConfig, PlotterExtensionWidget } from '../../types';
import type { DeltaSignal } from '../../types/stream';
import { SKWorkerService } from '../skstream/skstream.service';
import { PlotterExtensionService } from '../plotterext/plotterext.service';
import { applyContent, LayoutContent, SavedLayout } from './layout-model';
import { LayoutService } from './layout.service';
import {
  WORKING_COPY_STORAGE_KEY,
  WorkingCopyStore
} from './working-copy.store';

const PATH = '/resources/freeboardLayouts';

const widget = (instanceId: string, col = 0): PlotterExtensionWidget => ({
  instanceId,
  extension: 'ext',
  widget: 'gauge',
  anchor: 'tr',
  col,
  row: 0
});

const layout = (
  name: string,
  ...ids: string[]
): Omit<SavedLayout, 'revision'> => ({
  name,
  widgets: ids.map((id) => widget(id)),
  instances: {}
});

/** The server's layout store, as Freeboard's plugin keeps it. */
class FakeServer {
  layouts: Record<string, SavedLayout> = {};
  puts: Array<{ id: string; body: Record<string, unknown> }> = [];

  add(id: string, l: Omit<SavedLayout, 'revision'>, revision = 1) {
    this.layouts[id] = { ...structuredClone(l), revision };
  }

  api = {
    get: (_v: number, path: string): Observable<unknown> => {
      if (path === PATH) return of(structuredClone(this.layouts));
      const l = this.layouts[path.slice(PATH.length + 1)];
      return l
        ? of(structuredClone(l))
        : throwError(() => new HttpErrorResponse({ status: 404 }));
    },
    put: (_v: number, path: string, body: Record<string, unknown>) => {
      const id = path.slice(PATH.length + 1);
      this.puts.push({ id, body });
      const current = this.layouts[id];
      if (
        body.baseRevision !== undefined &&
        current &&
        current.revision !== body.baseRevision
      ) {
        return throwError(() => new HttpErrorResponse({ status: 400 }));
      }
      this.layouts[id] = {
        name: body.name as string,
        widgets: structuredClone(body.widgets as PlotterExtensionWidget[]),
        instances: structuredClone(body.instances as SavedLayout['instances']),
        revision: (current?.revision ?? 0) + 1
      };
      return of({});
    },
    delete: (_v: number, path: string) => {
      delete this.layouts[path.slice(PATH.length + 1)];
      return of({});
    }
  };
}

describe('LayoutService', () => {
  let server: FakeServer;
  let config: IAppConfig;
  let deltas: Subject<DeltaSignal>;
  let dialogResult: unknown;
  let app: {
    config: IAppConfig;
    skApiVersion: number;
    saveConfig: () => void;
    showMessage: ReturnType<typeof vi.fn>;
    showConfirm: ReturnType<typeof vi.fn>;
    showAlert: ReturnType<typeof vi.fn>;
    parseHttpErrorResponse: ReturnType<typeof vi.fn>;
  };
  let applyLayout: ReturnType<typeof vi.fn>;

  /** Start the service as the app does, on a browser holding `stored`. */
  const start = async (stored?: unknown) => {
    if (stored) {
      localStorage.setItem(WORKING_COPY_STORAGE_KEY, JSON.stringify(stored));
    }
    TestBed.configureTestingModule({
      providers: [
        LayoutService,
        { provide: AppFacade, useValue: app },
        { provide: SignalKClient, useValue: { api: server.api } },
        {
          provide: SKWorkerService,
          useValue: { resourceDelta$: () => deltas.asObservable() }
        },
        {
          provide: PlotterExtensionService,
          useValue: { retainInstances: vi.fn(), applyLayout }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(dialogResult) })
          }
        }
      ]
    });
    const copy = TestBed.inject(WorkingCopyStore);
    app.saveConfig = () => copy.snapshot(config);
    // the facade puts the working copy over every config it loads
    copy.overlay(config);
    const service = TestBed.inject(LayoutService);
    await service.init();
    return { service, copy };
  };

  /** Change this screen's widgets as the plotter extension host does. */
  const edit = (change: (c: IAppConfig) => void) => {
    change(config);
    app.saveConfig();
  };

  const delta = (id: string, value: SavedLayout | null) =>
    deltas.next({ path: `resources.freeboardLayouts.${id}`, value });

  beforeEach(() => {
    localStorage.clear();
    server = new FakeServer();
    config = defaultConfig();
    deltas = new Subject();
    dialogResult = undefined;
    applyLayout = vi.fn((content: LayoutContent) =>
      applyContent(config, content)
    );
    app = {
      config,
      skApiVersion: 2,
      saveConfig: () => undefined,
      showMessage: vi.fn(),
      showConfirm: vi.fn(() => of({ ok: true })),
      showAlert: vi.fn(() => of(undefined)),
      parseHttpErrorResponse: vi.fn()
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  describe('the layout a screen starts on', () => {
    it('keeps the widgets an older release saved, unlinked', async () => {
      config.plotterExtensions.widgets = [widget('mine')];
      server.add('d', layout('Default', 'other'));

      const { service, copy } = await start();

      expect(config.plotterExtensions.widgets).toEqual([widget('mine')]);
      expect(service.link()).toBeNull();
      expect(service.unsaved()).toBe(true);
      expect(copy.copy()?.content.widgets).toEqual([widget('mine')]);
      expect(config.plotterExtensions.namedLayouts).toBe(true);
    });

    it('starts on "Default" when it has no widgets', async () => {
      server.add('d', layout('default', 'a'));

      const { service } = await start();

      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
      expect(service.link()?.id).toBe('d');
      expect(service.modified()).toBe(false);
    });

    it('starts on "Default" over widgets only mirrored for older releases', async () => {
      config.plotterExtensions.widgets = [widget('another-screen')];
      config.plotterExtensions.namedLayouts = true;
      server.add('d', layout('Default', 'a'));

      const { service } = await start();

      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
      expect(service.link()?.id).toBe('d');
    });

    it('starts empty, without an error, when there is no "Default"', async () => {
      server.add('h', layout('Helm', 'a'));

      const { service } = await start();

      expect(config.plotterExtensions.widgets).toEqual([]);
      expect(service.link()).toBeNull();
      expect(app.showMessage).not.toHaveBeenCalled();
    });

    it('starts with no layouts at all when the server has no layout store', async () => {
      server.api.get = () =>
        throwError(() => new HttpErrorResponse({ status: 404 }));

      const { service } = await start();

      expect(service.available()).toBe(false);
      expect(config.plotterExtensions.widgets).toEqual([]);
    });

    it('keeps the working copy this browser holds, edits included', async () => {
      server.add('h', layout('Helm', 'a'));
      server.add('d', layout('Default', 'd'));
      const base = { widgets: [widget('a')], instances: {} };

      const { service } = await start({
        content: { widgets: [widget('a', 1)], instances: {} },
        link: { id: 'h', name: 'Helm', revision: 1, base }
      });

      expect(config.plotterExtensions.widgets).toEqual([widget('a', 1)]);
      expect(service.link()?.id).toBe('h');
      expect(service.modified()).toBe(true);
    });

    it('takes "Default" once it can read the layouts, if it still has no widgets', async () => {
      server.add('d', layout('Default', 'a'));
      const empty = { widgets: [], instances: {} };

      const { service } = await start({ content: empty, link: null });

      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
      expect(service.link()?.id).toBe('d');
    });

    it('keeps an unlinked copy that has widgets, over "Default"', async () => {
      server.add('d', layout('Default', 'a'));

      const { service } = await start({
        content: { widgets: [widget('mine')], instances: {} },
        link: null
      });

      expect(config.plotterExtensions.widgets).toEqual([widget('mine')]);
      expect(service.link()).toBeNull();
    });

    it('unlinks a working copy whose layout was deleted meanwhile', async () => {
      const base = { widgets: [widget('a')], instances: {} };

      const { service } = await start({
        content: base,
        link: { id: 'gone', name: 'Helm', revision: 1, base }
      });

      expect(service.link()).toBeNull();
      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
    });
  });

  describe('a layout saved on another screen', () => {
    beforeEach(() => server.add('h', layout('Helm', 'a')));

    it('replaces an unchanged copy', async () => {
      const { service } = await start();
      await service.load('h');

      delta('h', { ...layout('Helm', 'a', 'b'), revision: 2 });

      expect(config.plotterExtensions.widgets.map((w) => w.instanceId)).toEqual(
        ['a', 'b']
      );
      expect(service.link()?.revision).toBe(2);
      expect(service.modified()).toBe(false);
      expect(service.outdated()).toBeNull();
    });

    it('leaves a changed copy alone and offers the newer version', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));
      applyLayout.mockClear();

      server.add('h', layout('Helm', 'a', 'b'), 2);
      delta('h', server.layouts['h']);

      expect(applyLayout).not.toHaveBeenCalled();
      expect(config.plotterExtensions.widgets).toEqual([widget('a', 1)]);
      expect(service.modified()).toBe(true);
      expect(service.outdated()?.revision).toBe(2);

      await service.reload();
      expect(service.modified()).toBe(false);
      expect(service.outdated()).toBeNull();
    });

    it('keeps a changed copy linked when the layout is only renamed', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));

      delta('h', { ...layout('Wheelhouse', 'a'), revision: 2 });

      expect(service.link()).toMatchObject({ name: 'Wheelhouse', revision: 2 });
      expect(service.modified()).toBe(true);
      expect(service.outdated()).toBeNull();
    });

    it('keeps the widgets of a layout deleted elsewhere, unlinked', async () => {
      const { service } = await start();
      await service.load('h');

      delta('h', null);

      expect(service.link()).toBeNull();
      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
      expect(service.layouts()).toEqual({});
      expect(app.showMessage).toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    beforeEach(() => server.add('h', layout('Helm', 'a')));

    it('saves changes into the layout shown, and its own delta changes nothing', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));

      await service.save();
      delta('h', server.layouts['h']);

      expect(server.puts.at(-1)?.body.baseRevision).toBe(1);
      expect(server.layouts['h'].widgets).toEqual([widget('a', 1)]);
      expect(service.link()?.revision).toBe(2);
      expect(service.modified()).toBe(false);
      expect(service.outdated()).toBeNull();
    });

    it('asks before replacing a newer save from another screen', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));
      server.add('h', layout('Helm', 'a', 'b'), 2);
      dialogResult = 'overwrite';

      await service.save();

      expect(server.puts.at(-1)?.body.baseRevision).toBeUndefined();
      expect(server.layouts['h']).toMatchObject({
        revision: 3,
        widgets: [widget('a', 1)]
      });
      expect(service.link()?.revision).toBe(3);
      expect(service.modified()).toBe(false);
    });

    it('can discard this screen’s changes for the newer save', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));
      server.add('h', layout('Helm', 'a', 'b'), 2);
      dialogResult = 'discard';

      await service.save();

      expect(server.layouts['h'].revision).toBe(2);
      expect(config.plotterExtensions.widgets.map((w) => w.instanceId)).toEqual(
        ['a', 'b']
      );
      expect(service.link()?.revision).toBe(2);
    });

    it('saves as a new layout keeping the widgets, linked to it', async () => {
      config.plotterExtensions.widgets = [widget('mine')];
      const { service } = await start();
      dialogResult = 'Chart table';

      await service.saveAs();

      const [id, saved] = Object.entries(server.layouts).find(
        ([, l]) => l.name === 'Chart table'
      )!;
      expect(saved.widgets).toEqual([widget('mine')]);
      expect(service.link()?.id).toBe(id);
      expect(service.unsaved()).toBe(false);
    });

    it('asks before saving over a layout of the same name', async () => {
      config.plotterExtensions.widgets = [widget('mine')];
      const { service } = await start();
      dialogResult = 'HELM';

      await service.saveAs();

      expect(app.showConfirm).toHaveBeenCalled();
      expect(Object.keys(server.layouts)).toEqual(['h']);
      expect(server.layouts['h']).toMatchObject({
        name: 'Helm',
        widgets: [widget('mine')]
      });
      expect(service.link()?.id).toBe('h');
    });
  });

  describe('switching', () => {
    beforeEach(() => {
      server.add('h', layout('Helm', 'a'));
      server.add('c', layout('Chart table', 'c'));
    });

    it('asks before dropping unsaved changes, and keeps them if told not to', async () => {
      const { service } = await start();
      await service.load('h');
      edit((c) => (c.plotterExtensions.widgets[0].col = 1));
      app.showConfirm.mockReturnValueOnce(of(null));

      await service.load('c');

      expect(service.link()?.id).toBe('h');
      expect(config.plotterExtensions.widgets).toEqual([widget('a', 1)]);
    });

    it('starts a blank layout, unlinked', async () => {
      const { service } = await start();
      await service.load('h');

      await service.newBlank();

      expect(config.plotterExtensions.widgets).toEqual([]);
      expect(service.link()).toBeNull();
    });

    it('unlinks this screen when it deletes the layout it shows', async () => {
      const { service } = await start();
      await service.load('h');

      await service.remove('h');
      delta('h', null);

      expect(service.link()).toBeNull();
      expect(config.plotterExtensions.widgets).toEqual([widget('a')]);
      expect(app.showMessage).not.toHaveBeenCalled();
    });
  });
});
