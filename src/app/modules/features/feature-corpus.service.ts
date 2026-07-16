import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  compileCorpus,
  categoryHue,
  CategoryDef,
  CompiledFeature,
  FeatureCorpusPayload
} from './feature-corpus';

/**
 * Loads the bundled feature corpus (`assets/features-corpus.json`, produced by
 * `scripts/build-features.mjs`) and exposes the compiled feature list. Fetched
 * once and cached; a missing/invalid payload yields an empty list rather than
 * an error, so the browser degrades gracefully.
 */
@Injectable({ providedIn: 'root' })
export class FeatureCorpusService {
  private http = inject(HttpClient);
  private readonly _features = signal<CompiledFeature[]>([]);
  private categories: CategoryDef[] = [];
  private loadPromise: Promise<CompiledFeature[]> | null = null;

  readonly features = this._features.asReadonly();

  /** Loads the corpus once; concurrent callers share the in-flight fetch. */
  load(): Promise<CompiledFeature[]> {
    return (this.loadPromise ??= this.fetch());
  }

  private async fetch(): Promise<CompiledFeature[]> {
    try {
      const payload = await firstValueFrom(
        this.http.get<FeatureCorpusPayload>('assets/features-corpus.json')
      );
      this.categories = payload.categories ?? [];
      this._features.set(compileCorpus(payload));
    } catch {
      this._features.set([]);
    }
    return this._features();
  }

  /** Chip hue for a category (deliberate colour from `categories.json`). */
  hueFor(category: string): number {
    return categoryHue(this.categories, category);
  }
}
