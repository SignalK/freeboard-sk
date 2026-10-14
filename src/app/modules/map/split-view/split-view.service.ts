import { computed, Injectable, signal } from '@angular/core';
import { Map as OlMap } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { FeatureLike } from 'ol/Feature';
import { Subject } from 'rxjs';
import { FBClickEvent } from 'src/app/modules/map/ol/lib/map.component';
import { Position } from 'src/app/types';
import {
  clampRatio,
  fitRatio,
  parseSplitViewState,
  SplitViewState,
  SPLIT_VIEW_STORAGE_KEY
} from './split-view';

/**
 * A tap on the second pane, handed to the main chart to handle as its own:
 * the second pane shows the main chart's own features (see layer-mirror), so
 * the same popovers and actions apply.
 */
export type SecondaryTap =
  | {
      kind: 'click';
      event: FBClickEvent;
      map: OlMap;
      /** When the tap pressed down (Date.now()), to tell a tap from a hold. */
      pressedAt: number;
    }
  | {
      kind: 'contextmenu';
      event: MouseEvent;
      features: FeatureLike[];
      lonlat: Coordinate;
      worldOffset: number;
      map: OlMap;
      /** The pane's zoom: menu items that need a zoom go by it. */
      zoom: number;
    };

/** The two chart panes. The shared map buttons act on the active one. */
export type SplitPane = 'main' | 'secondary';

/** A shared map button's action, for the second pane to apply to its view. */
export type PaneCommand =
  | { kind: 'zoom'; step: number }
  | { kind: 'center'; position: Position; zoom?: number };

/** Whether the chart is split in two, and how the second pane is set up. */
@Injectable({ providedIn: 'root' })
export class SplitViewService {
  private state = signal<SplitViewState>(this.read());
  private secondary = signal<OlMap | null>(null);
  private taps = new Subject<SecondaryTap>();
  private pointer = new Subject<Position>();
  private active = signal<SplitPane>('main');
  private commands = new Subject<PaneCommand>();
  private panel = signal<{ width: number; height: number } | null>(null);
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  /** The second pane's map while the pane is open. */
  readonly secondaryMap = this.secondary.asReadonly();
  readonly taps$ = this.taps.asObservable();
  /** Where the pointer is over the second pane, for the position readout. */
  readonly pointer$ = this.pointer.asObservable();
  readonly commands$ = this.commands.asObservable();

  readonly enabled = computed(() => this.state().enabled);
  readonly ratio = computed(() => this.state().ratio);
  readonly northUp = computed(() => this.state().northUp);
  readonly follow = computed(() => this.state().follow);
  /** The second pane's zoom as last reported by its map. */
  readonly zoom = computed(() => this.state().zoom);

  /**
   * Whether the panes are stacked: when the map panel is taller than it is
   * wide (a phone held upright, or a side panel taking the width).
   */
  readonly stacked = computed(() => {
    const panel = this.panel();
    return !!panel && panel.height > panel.width;
  });

  /**
   * The share the main chart gets on screen: the chosen ratio, moved in so
   * neither pane is too narrow to show a popover.
   */
  readonly shownRatio = computed(() => {
    const panel = this.panel();
    if (!panel) {
      return this.ratio();
    }
    return fitRatio(this.ratio(), this.stacked() ? panel.height : panel.width);
  });

  /** True while the shared map buttons act on the second pane. */
  readonly secondaryActive = computed(
    () => this.active() === 'secondary' && this.secondary() !== null
  );

  /** The second pane's last view, for reopening it where it was left. */
  lastView(): Pick<SplitViewState, 'zoom' | 'center'> {
    const { zoom, center } = this.state();
    return { zoom, center };
  }

  toggle() {
    const enabled = !this.state().enabled;
    // A pane that has just opened is the one the user is about to set up.
    this.active.set(enabled ? 'secondary' : 'main');
    this.update({ enabled });
  }

  activate(pane: SplitPane) {
    this.active.set(pane);
  }

  /**
   * @param save false while the divider is being dragged: it is saved once,
   * when the drag ends (see save()).
   */
  setRatio(ratio: number, save = true) {
    this.update({ ratio: clampRatio(ratio) }, save);
  }

  /** The size of the panel the two panes share, as laid out. */
  setPanelSize(width: number, height: number) {
    this.panel.set({ width, height });
  }

  setNorthUp(northUp: boolean) {
    this.update({ northUp });
  }

  setFollow(follow: boolean) {
    this.update({ follow });
  }

  /**
   * Called on every move of the second pane's map, which a divider drag
   * fires per frame: the write to storage waits for the moves to settle.
   */
  rememberView(zoom: number, center: Position) {
    this.update({ zoom, center }, false);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 500);
  }

  setSecondaryMap(map: OlMap | null) {
    this.secondary.set(map);
  }

  forwardTap(tap: SecondaryTap) {
    this.taps.next(tap);
  }

  forwardPointer(lonlat: Position) {
    this.pointer.next(lonlat);
  }

  zoomBy(step: number) {
    this.commands.next({ kind: 'zoom', step });
  }

  centerOn(position: Position, zoom?: number) {
    this.commands.next({ kind: 'center', position, zoom });
  }

  private update(patch: Partial<SplitViewState>, save = true) {
    this.state.update((s) => ({ ...s, ...patch }));
    if (save) {
      this.save();
    }
  }

  /** Writes the current state to storage. */
  save() {
    clearTimeout(this.saveTimer);
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
