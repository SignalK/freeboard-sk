import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AppFacade } from 'src/app/app.facade';
import { SKStreamFacade } from 'src/app/modules/skstream/skstream.facade';
import { PipAppService } from './pip-app.service';
import { PIP_APP_SANDBOX, PipAppDef } from './types';

/** The parts of the Document Picture-in-Picture API used here. */
interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
}

/** Same filter as `.app-night` in styles.scss. */
const NIGHT_FILTER = 'brightness(0.3) sepia(0.2) hue-rotate(-30deg)';

export type PopoutMode = 'document-pip' | 'popup';

/**
 * Moves PiP App windows out of the page: into the tab's one always-on-top
 * Document Picture-in-Picture window where the browser has one, otherwise
 * into plain popups. While a window is out its in-app iframe is unmounted,
 * so the embedded app never runs twice.
 *
 * The Document PiP window is observable: it comes back on `pagehide`, and is
 * replaced when another window pops out. A `noopener` popup is not: it stays
 * out (persisted with the window) until the user confirms with Bring back.
 */
@Injectable({ providedIn: 'root' })
export class PipAppPopoutService {
  private app = inject(AppFacade);
  private stream = inject(SKStreamFacade);
  private service = inject(PipAppService);

  /** The window shown in the Document PiP window, if any. Runtime only. */
  readonly pipId = signal<string | null>(null);

  private pipWindow: Window | null = null;

  constructor() {
    // The window was closed (or removed by a config reload) while in the
    // Document PiP window: close that too.
    effect(() => {
      const id = this.pipId();
      const ids = this.service.windows().map((w) => w.id);
      if (id && !ids.includes(id)) untracked(() => this.popIn(id));
    });
    effect(() => {
      const night = this.isNight();
      if (this.pipId()) untracked(() => this.applyNight(night));
    });
  }

  /** An always-on-top window is available (not when Freeboard is embedded). */
  get alwaysOnTop(): boolean {
    return !!this.documentPip() && this.app.isTopWindow();
  }

  /** Where `def` is shown outside the page, or null while it is in-app. */
  modeOf(def: PipAppDef): PopoutMode | null {
    if (def.popout === 'popup') return 'popup';
    return this.pipId() === def.id ? 'document-pip' : null;
  }

  /**
   * Pop `def` out. Must be called from a user gesture (a click), which both
   * browser APIs require.
   */
  async popOut(def: PipAppDef, size: { w: number; h: number }) {
    const url = this.service.resolveUrl(def.source);
    if (!url || this.modeOf(def)) return;
    const width = Math.round(size.w);
    const height = Math.round(size.h);
    const dpip = this.alwaysOnTop ? this.documentPip() : null;
    if (dpip) {
      // One Document PiP window per tab: the new one replaces the old.
      const current = this.pipId();
      if (current) this.popIn(current);
      let pip: Window;
      try {
        pip = await dpip.requestWindow({ width, height });
      } catch (err) {
        console.warn('PiP App: picture-in-picture window refused', err);
        return;
      }
      if (!this.service.windows().some((w) => w.id === def.id)) {
        pip.close();
        return;
      }
      this.pipWindow = pip;
      this.buildDocument(pip.document, url, def.title);
      this.pipId.set(def.id);
      this.applyNight(this.isNight());
      pip.addEventListener('pagehide', () => {
        // Ignore a late event from a window that was already replaced.
        if (this.pipWindow === pip) this.popIn(def.id);
      });
    } else {
      // noopener: the page cannot reach back into Freeboard through
      // window.opener. It also means the popup cannot be watched for
      // closing, so it comes back only through Bring back.
      window.open(
        url,
        `fsk-pip-${def.id}`,
        `popup=yes,noopener,width=${width},height=${height}`
      );
      this.service.setPopout(def.id, 'popup');
    }
  }

  /** Bring a popped-out window back into the page. */
  popIn(id: string) {
    if (this.pipId() === id) {
      const pip = this.pipWindow;
      this.pipWindow = null;
      this.pipId.set(null);
      pip?.close();
    }
    if (this.service.windows().find((w) => w.id === id)?.popout) {
      this.service.setPopout(id, null);
    }
  }

  private documentPip(): DocumentPictureInPicture | undefined {
    return (window as { documentPictureInPicture?: DocumentPictureInPicture })
      .documentPictureInPicture;
  }

  private isNight(): boolean {
    return this.stream.selfNightMode() || this.app.uiCtrl().forceNightMode;
  }

  private applyNight(night: boolean) {
    const body = this.pipWindow?.document?.body;
    if (body) body.style.filter = night ? NIGHT_FILTER : '';
  }

  private buildDocument(doc: Document, url: string, title: string) {
    doc.title = title;
    doc.body.style.margin = '0';
    doc.body.style.background = '#000';
    const frame = doc.createElement('iframe');
    frame.setAttribute('sandbox', PIP_APP_SANDBOX);
    frame.setAttribute('allow', 'fullscreen');
    frame.title = title;
    frame.style.cssText =
      'border:0;display:block;width:100vw;height:100vh;background:#fff';
    frame.src = url;
    doc.body.append(frame);
  }
}
