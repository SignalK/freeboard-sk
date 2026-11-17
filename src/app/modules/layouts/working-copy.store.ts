import { Injectable, computed, signal } from '@angular/core';
import type { IAppConfig } from 'src/app/types';
import {
  applyContent,
  contentOf,
  isModified,
  LayoutLink,
  parseWorkingCopy,
  WorkingCopy
} from './layout-model';

export const WORKING_COPY_STORAGE_KEY = 'fb-layout-working-copy';

/**
 * This screen's working copy of its widget layout, kept in this browser.
 *
 * The app keeps working on `config.plotterExtensions` as before; this store
 * puts the copy back over every config that loads (so a signed-in user's
 * settings, which sync from other screens, don't replace this screen's
 * widgets) and takes a fresh copy on every config save. It has no
 * dependencies, so `AppFacade` can use it.
 */
@Injectable({ providedIn: 'root' })
export class WorkingCopyStore {
  private readonly _copy = signal<WorkingCopy | null>(this.read());
  readonly copy = this._copy.asReadonly();
  readonly link = computed(() => this._copy()?.link ?? null);
  readonly modified = computed(() => isModified(this._copy()));

  /**
   * Copies are taken only once the layout this screen starts on is settled:
   * before that the config may still hold another screen's widgets, or, before
   * a sign-in, none of the user's.
   */
  private started = false;

  /** Whether the layout this screen starts on is settled. */
  get settled() {
    return this.started;
  }

  /** Whether this browser held a working copy when the app started. */
  readonly existedAtStart = this._copy() !== null;

  private read(): WorkingCopy | null {
    try {
      const stored = localStorage.getItem(WORKING_COPY_STORAGE_KEY);
      return stored ? parseWorkingCopy(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  }

  private write(copy: WorkingCopy) {
    this._copy.set(copy);
    try {
      localStorage.setItem(WORKING_COPY_STORAGE_KEY, JSON.stringify(copy));
    } catch {
      // storage full or unavailable: the copy lasts until the page closes
    }
  }

  /** Put this screen's working copy into a config that has just loaded. */
  overlay(config: IAppConfig) {
    const copy = this._copy();
    if (copy) {
      applyContent(config, copy.content);
    }
  }

  /** Take a fresh copy of the config's layout, keeping its link. */
  snapshot(config: IAppConfig) {
    if (!this.started) return;
    this.markNamedLayouts(config);
    this.write({
      content: contentOf(config),
      link: this._copy()?.link ?? null
    });
  }

  /** Settle the layout this screen starts on; copies are taken from now on. */
  start(config: IAppConfig, link: LayoutLink | null) {
    this.started = true;
    this.markNamedLayouts(config);
    this.write({ content: contentOf(config), link });
  }

  /**
   * Mark the settings as saved by a release with named layouts, on every
   * save: settings loaded later (a sign-in) may not carry the mark yet.
   */
  private markNamedLayouts(config: IAppConfig) {
    config.plotterExtensions.namedLayouts = true;
  }

  /** Link the working copy to a named layout, or unlink it: a choice that settles it. */
  setLink(config: IAppConfig, link: LayoutLink | null) {
    this.start(config, link);
  }
}
