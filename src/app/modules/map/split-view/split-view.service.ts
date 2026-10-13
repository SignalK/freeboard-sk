import { computed, Injectable, signal } from '@angular/core';
import { Position } from 'src/app/types';
import {
  clampRatio,
  parseSplitViewState,
  SplitViewState,
  SPLIT_VIEW_STORAGE_KEY
} from './split-view';

/** Whether the chart is split in two, and how the second pane is set up. */
@Injectable({ providedIn: 'root' })
export class SplitViewService {
  private state = signal<SplitViewState>(this.read());

  readonly enabled = computed(() => this.state().enabled);
  readonly ratio = computed(() => this.state().ratio);
  readonly northUp = computed(() => this.state().northUp);
  readonly follow = computed(() => this.state().follow);

  /** The second pane's last view, for reopening it where it was left. */
  lastView(): Pick<SplitViewState, 'zoom' | 'center'> {
    const { zoom, center } = this.state();
    return { zoom, center };
  }

  toggle() {
    this.update({ enabled: !this.state().enabled });
  }

  setRatio(ratio: number) {
    this.update({ ratio: clampRatio(ratio) });
  }

  setNorthUp(northUp: boolean) {
    this.update({ northUp });
  }

  setFollow(follow: boolean) {
    this.update({ follow });
  }

  rememberView(zoom: number, center: Position) {
    this.update({ zoom, center });
  }

  private update(patch: Partial<SplitViewState>) {
    this.state.update((s) => ({ ...s, ...patch }));
    try {
      localStorage.setItem(
        SPLIT_VIEW_STORAGE_KEY,
        JSON.stringify(this.state())
      );
    } catch {
      // Storage full or unavailable: the layout just won't be remembered.
    }
  }

  private read(): SplitViewState {
    try {
      return parseSplitViewState(localStorage.getItem(SPLIT_VIEW_STORAGE_KEY));
    } catch {
      return parseSplitViewState(null);
    }
  }
}
