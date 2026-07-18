import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { A11yModule } from '@angular/cdk/a11y';
import { RemarkModule } from 'ngx-remark';
import { markdownProcessor } from '../../lib/markdown';

import { FeatureCorpusService } from './feature-corpus.service';
import {
  CompiledFeature,
  FeatureSortColumn,
  SortDirection,
  sortFeatures,
  filterFeatures,
  nextRowIndex
} from './feature-corpus';

/**
 * The Feature Browser: an always-available, searchable catalogue of the app's
 * features. A details pane (top) shows the highlighted feature; a sortable table
 * (bottom) lists them by category, title, and the release they last changed in.
 */
@Component({
  selector: 'fb-feature-browser',
  imports: [
    FormsModule,
    MatDialogModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
    A11yModule,
    RemarkModule,
    DatePipe
  ],
  templateUrl: './feature-browser-dialog.html',
  styleUrl: './feature-browser-dialog.css'
})
export class FeatureBrowserDialog implements OnInit {
  protected readonly mdProcessor = markdownProcessor;
  private corpus = inject(FeatureCorpusService);
  protected dialogRef = inject(MatDialogRef<FeatureBrowserDialog>);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly loading = signal(true);
  protected readonly query = signal('');
  protected readonly sortColumn = signal<FeatureSortColumn>('since');
  protected readonly sortDirection = signal<SortDirection>('desc');
  private readonly selectedId = signal<string | null>(null);
  protected readonly all = signal<CompiledFeature[]>([]);

  protected readonly columns: string[] = [
    'category',
    'title',
    'status',
    'since'
  ];

  protected readonly displayed = computed(() =>
    sortFeatures(
      filterFeatures(this.all(), this.query()),
      this.sortColumn(),
      this.sortDirection()
    )
  );

  /** The feature shown in the details pane: the selected one if still visible,
   *  otherwise the first row (so filtering/sorting never leaves it empty). */
  protected readonly activeFeature = computed(() => {
    const list = this.displayed();
    const id = this.selectedId();
    return list.find((f) => f.id === id) ?? list[0] ?? null;
  });

  /** Image viewer (lightbox): index into the active feature's images, or null. */
  private readonly viewerIndex = signal<number | null>(null);
  protected readonly viewerImage = computed(() => {
    const i = this.viewerIndex();
    const imgs = this.activeFeature()?.images ?? [];
    return i === null ? null : (imgs[i] ?? null);
  });
  protected readonly viewerHasMultiple = computed(
    () => (this.activeFeature()?.images.length ?? 0) > 1
  );

  async ngOnInit() {
    // Bind via the dialog's keydown stream (not @HostListener) so arrow keys
    // work regardless of which element inside the dialog has focus.
    this.dialogRef.keydownEvents().subscribe((e) => this.handleKey(e));
    this.all.set(await this.corpus.load());
    this.loading.set(false);
  }

  protected setSort(column: FeatureSortColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'since' ? 'desc' : 'asc');
    }
  }

  protected sortIcon(column: FeatureSortColumn): string {
    if (this.sortColumn() !== column) return '';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  /** aria-sort value for a sortable column header. */
  protected ariaSort(
    column: FeatureSortColumn
  ): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected select(feature: CompiledFeature) {
    this.selectedId.set(feature.id);
  }

  /** Keyboard: when the viewer is open, ←/→ page images and Esc closes it;
   *  otherwise ↑/↓ move the highlighted row through the list. */
  private handleKey(event: KeyboardEvent) {
    if (this.viewerIndex() !== null) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.stepViewer(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.stepViewer(1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closeViewer();
      }
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const list = this.displayed();
    if (list.length === 0) return;
    event.preventDefault();
    const current = list.findIndex((f) => f.id === this.activeFeature()?.id);
    const next = nextRowIndex(current, event.key, list.length);
    this.selectedId.set(list[next].id);
    // Scroll by row index rather than the `.active` class: the rows already
    // exist in `displayed()` order, so this doesn't depend on change detection
    // having re-applied the highlight class before this callback runs.
    requestAnimationFrame(() => this.revealRow(next));
  }

  /** Bring row `index` fully into view, keeping it clear of the sticky header. */
  private revealRow(index: number) {
    const root = this.host.nativeElement;
    const container = root.querySelector<HTMLElement>('.table-scroll');
    const row = root.querySelectorAll<HTMLElement>('tr[mat-row]')[index];
    if (!container || !row) return;
    const headerHeight =
      root.querySelector<HTMLElement>('tr[mat-header-row]')?.offsetHeight ?? 0;
    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const topLimit = containerRect.top + headerHeight;
    if (rowRect.top < topLimit) {
      container.scrollTop -= topLimit - rowRect.top;
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollTop += rowRect.bottom - containerRect.bottom;
    }
  }

  protected isActive(feature: CompiledFeature): boolean {
    return this.activeFeature()?.id === feature.id;
  }

  protected sinceLabel(f: CompiledFeature): string {
    if (!f.since) return 'Unreleased';
    return `${f.latestKind === 'enhanced' ? 'Updated' : 'New'} in ${f.since}`;
  }

  /** Chip hue for a category (deliberate colour from `categories.json`). */
  protected categoryHue(category: string): number {
    return this.corpus.hueFor(category);
  }

  protected prUrl(pr: number): string {
    return `https://github.com/SignalK/freeboard-sk/pull/${pr}`;
  }

  /** Resolve a body-image URL. External http(s)/data URLs pass through; anything
   *  else (incl. an accidental leading slash) resolves against the app base, so it
   *  works when Freeboard is served under a subpath. */
  protected resolveShot(url: string): string {
    if (/^(https?:|data:)/i.test(url)) return url;
    return `assets/features/${url.replace(/^\/+/, '')}`;
  }

  protected openViewer(url: string) {
    const imgs = this.activeFeature()?.images ?? [];
    const i = imgs.findIndex((im) => im.url === url);
    if (i < 0) return;
    // While the viewer is open, Escape should close it — not the whole dialog.
    this.dialogRef.disableClose = true;
    this.viewerIndex.set(i);
  }

  protected closeViewer() {
    this.viewerIndex.set(null);
    this.dialogRef.disableClose = false;
  }

  protected stepViewer(delta: number) {
    const imgs = this.activeFeature()?.images ?? [];
    const i = this.viewerIndex();
    if (i === null || imgs.length === 0) return;
    this.viewerIndex.set((i + delta + imgs.length) % imgs.length);
  }
}
