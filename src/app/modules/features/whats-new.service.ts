import { Injectable, inject, signal } from '@angular/core';

import { FeatureCorpusService } from './feature-corpus.service';
import { eventKeys, unseenEvents } from './whats-new';

const SEEN_STORAGE_KEY = 'fb-whats-new-seen';

/**
 * Tracks which feature-ledger change events the user has seen and exposes
 * `hasUnseen` — the single signal behind the passive "What's New" lightbulb.
 *
 * - `init()` (app startup) compares the corpus' events with the stored seen
 *   list; with nothing stored (a first-ever run) every event is unseen, so a
 *   new user gets a lit bulb pointing them at the Feature Browser once.
 * - `markAllSeen()` (opening the Feature Browser by ANY entry point) persists
 *   the current events and extinguishes the indicator.
 *
 * Seen-state lives in browser localStorage (same v0 approach as the plotter
 * extensions' widget state).
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
  private corpus = inject(FeatureCorpusService);

  private readonly _hasUnseen = signal(false);
  readonly hasUnseen = this._hasUnseen.asReadonly();

  /** Evaluate the indicator at startup (cheap: the corpus fetch is cached). */
  async init(): Promise<void> {
    const features = await this.corpus.load();
    const unseen = unseenEvents(eventKeys(features), this.readSeen());
    this._hasUnseen.set(unseen.length > 0);
  }

  /** Mark every change event seen and turn the indicator off. */
  async markAllSeen(): Promise<void> {
    const features = await this.corpus.load();
    this.writeSeen(eventKeys(features));
    this._hasUnseen.set(false);
  }

  private readSeen(): unknown {
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      // unavailable/corrupt storage reads as a first run → everything unseen
      return null;
    }
  }

  private writeSeen(keys: string[]): void {
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // storage unavailable — the indicator just re-evaluates next session
    }
  }
}
