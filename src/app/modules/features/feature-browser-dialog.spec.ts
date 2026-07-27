import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompiledFeature } from './feature-corpus';
import { FeatureCorpusService } from './feature-corpus.service';
import { FeatureBrowserDialog } from './feature-browser-dialog';

function feature(id: string, title: string): CompiledFeature {
  return {
    id,
    title,
    category: 'General',
    body: `# ${title}\n\nprose`,
    since: '2.1.0',
    latestKind: 'new',
    events: [],
    recentChanges: null,
    images: []
  };
}

describe('FeatureBrowserDialog details scroll', () => {
  let fixture: ComponentFixture<FeatureBrowserDialog>;

  const corpus = [feature('alpha', 'Alpha'), feature('bravo', 'Bravo')];

  const detailsPane = () =>
    fixture.nativeElement.querySelector('.details') as HTMLElement;

  const rows = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tr[mat-row]')
    ) as HTMLElement[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FeatureBrowserDialog],
      providers: [
        provideNoopAnimations(),
        {
          provide: FeatureCorpusService,
          useValue: { load: async () => corpus, hueFor: () => 0 }
        },
        {
          provide: MatDialogRef,
          useValue: { keydownEvents: () => EMPTY, close: () => undefined }
        }
      ]
    });

    fixture = TestBed.createComponent(FeatureBrowserDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('returns the details pane to the top when another feature is selected', () => {
    const pane = detailsPane();
    expect(pane).toBeTruthy();

    // The user has read to the bottom of the first feature...
    pane.scrollTop = 250;

    // ...then picks a different row (whichever one isn't already shown).
    const other = rows().find((r) => !r.classList.contains('active'));
    expect(other).toBeTruthy();
    other?.click();
    fixture.detectChanges();

    expect(detailsPane().scrollTop).toBe(0);
  });
});

describe('FeatureBrowserDialog what’s-new strip', () => {
  let fixture: ComponentFixture<FeatureBrowserDialog>;

  const withStrip: CompiledFeature = {
    ...feature('route-planning', 'Route Planning'),
    events: [
      { pr: 2, date: '2026-07-02', title: 'reverse a route' },
      { pr: 1, date: '2026-07-01', title: 'plan a route' }
    ],
    recentChanges: {
      label: 'New in 3.1',
      shown: ['reverse a route', 'plan a route', 'undo while drawing'],
      more: 2
    }
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FeatureBrowserDialog],
      providers: [
        provideNoopAnimations(),
        {
          provide: FeatureCorpusService,
          useValue: { load: async () => [withStrip], hueFor: () => 0 }
        },
        {
          provide: MatDialogRef,
          useValue: { keydownEvents: () => EMPTY, close: () => undefined }
        }
      ]
    });

    fixture = TestBed.createComponent(FeatureBrowserDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows the label and only the capped titles', () => {
    const strip = fixture.nativeElement.querySelector('.whats-new');
    expect(strip).toBeTruthy();
    expect(strip.querySelector('.whats-new-title').textContent).toContain(
      'New in 3.1'
    );
    const titles = Array.from(strip.querySelectorAll('li')) as HTMLElement[];
    expect(titles.map((li) => li.textContent?.trim())).toEqual([
      'reverse a route',
      'plan a route',
      'undo while drawing'
    ]);
  });

  it('scrolls to the history table from the "+N more" affordance', () => {
    const history = fixture.nativeElement.querySelector(
      '.pr-history'
    ) as HTMLElement;
    expect(history).toBeTruthy();
    const scrollIntoView = vi.fn();
    history.scrollIntoView = scrollIntoView;

    const more = fixture.nativeElement.querySelector(
      '.whats-new-more'
    ) as HTMLElement;
    expect(more.textContent).toContain('+2 more');

    more.click();
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
