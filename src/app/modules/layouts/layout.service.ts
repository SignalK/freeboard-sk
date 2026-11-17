import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SignalKClient } from 'signalk-client-angular';
import * as uuid from 'uuid';

import { AppFacade } from 'src/app/app.facade';
import { SKWorkerService } from 'src/app/modules/skstream/skstream.service';
import { PlotterExtensionService } from 'src/app/modules/plotterext/plotterext.service';
import {
  applyContent,
  contentOf,
  findByName,
  findDefault,
  LayoutContent,
  LayoutLink,
  LAYOUTS_RESOURCE_TYPE,
  parseSavedLayout,
  sameContent,
  SavedLayout
} from './layout-model';
import { WorkingCopyStore } from './working-copy.store';
import {
  LayoutConflictChoice,
  LayoutConflictDialog,
  LayoutNameDialog
} from './layout-dialogs';

const DELTA_PREFIX = `resources.${LAYOUTS_RESOURCE_TYPE}.`;
const PATH = `/resources/${LAYOUTS_RESOURCE_TYPE}`;

const linkTo = (id: string, layout: SavedLayout): LayoutLink => ({
  id,
  name: layout.name,
  revision: layout.revision,
  base: { widgets: layout.widgets, instances: layout.instances }
});

/**
 * Named widget layouts: the list kept on the server, and this screen's working
 * copy's link to one of them (#1346).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private app = inject(AppFacade);
  private signalk = inject(SignalKClient);
  private worker = inject(SKWorkerService);
  private plotterExt = inject(PlotterExtensionService);
  private dialog = inject(MatDialog);
  private copy = inject(WorkingCopyStore);

  /** The named layouts on the server, by id. */
  readonly layouts = signal<Record<string, SavedLayout>>({});
  /** False when the server has no layout store (Freeboard's plugin is off). */
  readonly available = signal(false);
  readonly link = this.copy.link;
  readonly modified = this.copy.modified;
  /** A working copy with widgets that isn't saved as a named layout. */
  readonly unsaved = computed(
    () => !this.copy.link() && !!this.copy.copy()?.content.widgets.length
  );
  /**
   * The newer version of the linked layout, saved on another screen, that this
   * screen didn't take because its copy has changes of its own.
   */
  readonly outdated = computed(() => {
    const link = this.copy.link();
    const server = link ? this.layouts()[link.id] : undefined;
    return link &&
      server &&
      server.revision > link.revision &&
      !sameContent(server, link.base)
      ? server
      : null;
  });

  private started = false;
  private listening = false;

  constructor() {
    // device state of a widget in any saved layout outlives a switch away
    this.plotterExt.retainInstances(() =>
      Object.values(this.layouts()).flatMap((l) =>
        l.widgets.map((w) => w.instanceId)
      )
    );
  }

  /**
   * Fetch the layouts and, the first time, settle the layout this screen
   * starts on. Run once the settings in use are final, before the plotter
   * extension host places the widgets.
   */
  async init() {
    if (!this.listening) {
      this.listening = true;
      this.worker.resourceDelta$().subscribe((d) => {
        if (d.path.startsWith(DELTA_PREFIX)) {
          this.onDelta(d.path.slice(DELTA_PREFIX.length), d.value);
        }
      });
    }
    await this.refresh();
    if (!this.started) {
      this.started = true;
      this.settleStart();
    }
    const link = this.copy.link();
    if (link && this.available()) {
      const server = this.layouts()[link.id];
      if (server) {
        this.onServerVersion(link.id, server);
      } else {
        this.copy.setLink(this.app.config, null);
      }
    }
    // a screen showing no layout and no widgets of its own takes "Default",
    // also when it could only read the layouts once signed in
    if (!this.copy.link() && !this.copy.copy()?.content.widgets.length) {
      const fallback = findDefault(this.layouts());
      if (fallback) {
        this.show(...fallback);
      }
    }
  }

  /** Reload the list of layouts from the server. */
  async refresh() {
    try {
      const response = await firstValueFrom(
        this.signalk.api.get(this.app.skApiVersion, PATH)
      );
      const layouts: Record<string, SavedLayout> = {};
      for (const [id, value] of Object.entries(
        (response ?? {}) as Record<string, unknown>
      )) {
        const layout = parseSavedLayout(value);
        if (layout) layouts[id] = layout;
      }
      this.layouts.set(layouts);
      this.available.set(true);
    } catch {
      // no provider (Freeboard's plugin disabled) or not reachable
      this.available.set(false);
    }
  }

  /**
   * A screen with a working copy keeps it. One without starts from the
   * widgets in the settings if a release before named layouts saved them, and
   * otherwise from the "Default" layout, if there is one: the widgets in the
   * settings then only mirror another screen's, for older releases.
   */
  private settleStart() {
    const config = this.app.config;
    if (this.copy.existedAtStart) {
      this.copy.start(config, this.copy.link());
      return;
    }
    const ext = config.plotterExtensions;
    let link: LayoutLink | null = null;
    const ownWidgets = ext.widgets.length > 0 && !ext.namedLayouts;
    const fallback = findDefault(this.layouts());
    if (!ownWidgets && fallback) {
      applyContent(config, fallback[1]);
      link = linkTo(...fallback);
    }
    this.copy.start(config, link);
    this.app.saveConfig();
  }

  private onDelta(id: string, value: unknown) {
    if (value === null || value === undefined) {
      const gone = this.layouts()[id];
      this.forget(id);
      if (this.copy.link()?.id === id) {
        this.copy.setLink(this.app.config, null);
        this.app.showMessage(
          `Layout "${gone?.name ?? ''}" was deleted on another screen. This screen keeps its widgets.`
        );
      }
      return;
    }
    const layout = parseSavedLayout(value);
    if (!layout) return;
    this.layouts.update((all) => ({ ...all, [id]: layout }));
    this.onServerVersion(id, layout);
  }

  /** Bring the working copy up to a version of its layout from the server. */
  private onServerVersion(id: string, layout: SavedLayout) {
    const copy = this.copy.copy();
    const link = copy?.link;
    if (!copy || !link || link.id !== id || layout.revision < link.revision) {
      return;
    }
    if (sameContent(layout, copy.content)) {
      // what this screen shows, as saved (this screen's own save, or a rename)
      this.copy.setLink(this.app.config, linkTo(id, layout));
    } else if (sameContent(layout, link.base)) {
      // renamed elsewhere: the layout is unchanged, this screen's edits stay
      this.copy.setLink(this.app.config, {
        ...link,
        name: layout.name,
        revision: layout.revision
      });
    } else if (layout.revision > link.revision && !this.copy.modified()) {
      this.show(id, layout);
    }
    // otherwise the copy has its own changes: `outdated` offers the new version
  }

  /** Show a named layout on this screen, linking the working copy to it. */
  private show(id: string, layout: SavedLayout) {
    this.plotterExt.applyLayout(layout);
    this.copy.setLink(this.app.config, linkTo(id, layout));
  }

  private async fetch(id: string): Promise<SavedLayout | null> {
    try {
      return parseSavedLayout(
        await firstValueFrom(
          this.signalk.api.get(this.app.skApiVersion, `${PATH}/${id}`)
        )
      );
    } catch {
      return null;
    }
  }

  private async put(
    id: string,
    name: string,
    content: LayoutContent,
    baseRevision?: number
  ) {
    await firstValueFrom(
      this.signalk.api.put(this.app.skApiVersion, `${PATH}/${id}`, {
        name,
        widgets: content.widgets,
        instances: content.instances,
        ...(baseRevision !== undefined && { baseRevision })
      })
    );
    const stored = await this.fetch(id);
    if (stored) {
      this.layouts.update((all) => ({ ...all, [id]: stored }));
    }
    return stored;
  }

  /** Ask before replacing widgets that aren't saved anywhere. */
  private async confirmLeave(): Promise<boolean> {
    const link = this.copy.link();
    if (!this.copy.modified() && !this.unsaved()) return true;
    const what = link
      ? `This screen has changes to "${link.name}" that aren't saved.`
      : "This screen's widgets aren't saved as a layout.";
    const r = await firstValueFrom(
      this.app.showConfirm(
        `${what}\nDiscard them?`,
        'Discard changes',
        'Discard',
        'Cancel'
      )
    );
    return !!r?.ok;
  }

  private askName(title: string, name?: string): Promise<string | undefined> {
    return firstValueFrom(
      this.dialog
        .open(LayoutNameDialog, { data: { title, name } })
        .afterClosed()
    );
  }

  /** Save this screen's widgets into the layout it shows. */
  async save() {
    const link = this.copy.link();
    if (!link) {
      return this.saveAs();
    }
    const content = contentOf(this.app.config);
    try {
      const stored = await this.put(link.id, link.name, content, link.revision);
      if (stored) {
        this.copy.setLink(this.app.config, linkTo(link.id, stored));
      }
    } catch (err) {
      const current = await this.fetch(link.id);
      if (!current) {
        // deleted on another screen: saving puts it back
        if (this.available()) {
          const stored = await this.put(link.id, link.name, content).catch(
            (e) => (this.app.parseHttpErrorResponse(e), null)
          );
          if (stored)
            this.copy.setLink(this.app.config, linkTo(link.id, stored));
        } else {
          this.app.parseHttpErrorResponse(err);
        }
        return;
      }
      if (current.revision === link.revision) {
        this.app.parseHttpErrorResponse(err);
        return;
      }
      await this.resolveConflict(link.id, current, content);
    }
  }

  private async resolveConflict(
    id: string,
    current: SavedLayout,
    content: LayoutContent
  ) {
    this.layouts.update((all) => ({ ...all, [id]: current }));
    const choice: LayoutConflictChoice | undefined = await firstValueFrom(
      this.dialog
        .open(LayoutConflictDialog, { data: { name: current.name } })
        .afterClosed()
    );
    if (choice === 'overwrite') {
      try {
        const stored = await this.put(id, current.name, content);
        if (stored) this.copy.setLink(this.app.config, linkTo(id, stored));
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
      }
    } else if (choice === 'saveAs') {
      await this.saveAs();
    } else if (choice === 'discard') {
      this.show(id, current);
    }
  }

  /**
   * Save this screen's widgets as a layout of a new name, or over the layout
   * of that name after asking. The working copy is then linked to it.
   */
  async saveAs() {
    const name = await this.askName(
      'Save as new layout',
      this.copy.link()?.name
    );
    if (!name) return;
    const existing = findByName(this.layouts(), name);
    if (existing) {
      const r = await firstValueFrom(
        this.app.showConfirm(
          `There is already a layout named "${existing[1].name}".\nReplace it with this screen's widgets?`,
          'Replace layout',
          'Replace',
          'Cancel'
        )
      );
      if (!r?.ok) return;
    }
    const id = existing?.[0] ?? uuid.v4();
    try {
      const stored = await this.put(
        id,
        existing?.[1].name ?? name,
        contentOf(this.app.config)
      );
      if (stored) this.copy.setLink(this.app.config, linkTo(id, stored));
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  /** Replace this screen's widgets with a named layout. */
  async load(id: string) {
    if (!(await this.confirmLeave())) return;
    const layout = await this.fetch(id);
    if (!layout) {
      this.app.showMessage('That layout could not be loaded.');
      await this.refresh();
      return;
    }
    this.layouts.update((all) => ({ ...all, [id]: layout }));
    this.show(id, layout);
  }

  /** Take the newer version of this screen's layout, dropping its changes. */
  async reload() {
    const link = this.copy.link();
    if (!link) return;
    const layout = await this.fetch(link.id);
    if (layout) {
      this.show(link.id, layout);
    }
  }

  /** Start this screen afresh with no widgets and no layout. */
  async newBlank() {
    if (!(await this.confirmLeave())) return;
    this.plotterExt.applyLayout({ widgets: [], instances: {} });
    this.copy.setLink(this.app.config, null);
  }

  async rename(id: string) {
    const layout = this.layouts()[id];
    if (!layout) return;
    const name = await this.askName('Rename layout', layout.name);
    if (!name || name === layout.name) return;
    const clash = findByName(this.layouts(), name);
    if (clash && clash[0] !== id) {
      this.app.showAlert(
        'Rename layout',
        `There is already a layout named "${clash[1].name}".`
      );
      return;
    }
    try {
      const stored = await this.put(id, name, layout, layout.revision);
      if (stored) this.onServerVersion(id, stored);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
      await this.refresh();
    }
  }

  async remove(id: string) {
    const layout = this.layouts()[id];
    if (!layout) return;
    const r = await firstValueFrom(
      this.app.showConfirm(
        `Delete the layout "${layout.name}" from the server?\nScreens showing it keep their widgets.`,
        'Delete layout',
        'Delete',
        'Cancel'
      )
    );
    if (!r?.ok) return;
    try {
      await firstValueFrom(
        this.signalk.api.delete(this.app.skApiVersion, `${PATH}/${id}`)
      );
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        this.app.parseHttpErrorResponse(err);
        return;
      }
    }
    // this screen keeps its widgets, no longer linked to a layout
    if (this.copy.link()?.id === id) {
      this.copy.setLink(this.app.config, null);
    }
    this.forget(id);
  }

  private forget(id: string) {
    const layouts = { ...this.layouts() };
    delete layouts[id];
    this.layouts.set(layouts);
  }
}
