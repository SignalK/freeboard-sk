import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

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
