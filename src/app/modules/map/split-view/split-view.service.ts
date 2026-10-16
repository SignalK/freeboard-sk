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
  MIN_PANE_PX,
  parseSplitViewState,
  SplitViewState,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
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
  /** How far down each map toolbar reaches; see setToolbarReach. */
  private toolbars = signal<ReadonlyMap<object, number>>(new Map());
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // A view still waiting to be written goes with a page that is closed or
    // reloaded.
    window.addEventListener('pagehide', () => this.flush());
  }

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
   * The least the main chart keeps along the split. Stacked, the map toolbars
   * run down its sides, so it keeps enough height to show all their buttons.
   */
  readonly mainMin = computed(() =>
    this.stacked()
      ? Math.max(MIN_PANE_PX, ...this.toolbars().values())
      : MIN_PANE_PX
  );

  /**
   * The share the main chart gets on screen: the chosen ratio, moved in so
   * neither pane is too narrow to show a popover, and the main chart keeps
   * room for the toolbars.
   */
  readonly shownRatio = computed(() => {
    const panel = this.panel();
    if (!panel) {
      return this.ratio();
    }
    return this.fit(this.ratio(), this.stacked() ? panel.height : panel.width);
  });

  /** The shares the main chart can be shown at, as the divider can reach. */
  readonly shownRange = computed(() => {
    const panel = this.panel();
    if (!panel) {
      return { min: SPLIT_RATIO_MIN, max: SPLIT_RATIO_MAX };
    }
    const size = this.stacked() ? panel.height : panel.width;
    return {
      min: this.fit(SPLIT_RATIO_MIN, size),
      max: this.fit(SPLIT_RATIO_MAX, size)
    };
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

  setRatio(ratio: number) {
    this.update({ ratio: clampRatio(ratio) });
  }

  /** The size of the panel the two panes share, as laid out. */
  setPanelSize(width: number, height: number) {
    this.panel.set({ width, height });
  }

  /**
   * How far down from the top of the panel `toolbar` reaches, or null once it
   * is gone.
   */
  setToolbarReach(toolbar: object, px: number | null) {
    const reach = px === null ? null : Math.ceil(Math.max(0, px));
    this.toolbars.update((all) => {
      if ((all.get(toolbar) ?? null) === reach) {
        return all;
      }
      const next = new Map(all);
      if (reach === null) {
        next.delete(toolbar);
      } else {
        next.set(toolbar, reach);
      }
      return next;
    });
  }

  /**
   * The share the main chart gets of a panel `size` pixels long along the
   * split, for a divider at `ratio`.
   */
  fit(ratio: number, size: number): number {
    return fitRatio(ratio, size, MIN_PANE_PX, this.mainMin());
  }

  setNorthUp(northUp: boolean) {
    this.update({ northUp });
  }

  setFollow(follow: boolean) {
    this.update({ follow });
  }

  /**
   * Called on every settled move of the second pane's map, each fix included
   * while it follows the vessel: the write to storage waits for the moves to
   * settle, or is left to the next save.
   */
  rememberView(zoom: number, center: Position, write = true) {
    this.update({ zoom, center }, false);
    if (!write) {
      return;
    }
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

  /** Writes a view still waiting for the pane's moves to settle. */
  flush() {
    if (this.saveTimer !== undefined) {
      this.save();
    }
  }

  /** Writes the current state to storage. */
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
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
