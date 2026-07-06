import { NgZone, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi())
  ]
})
  .then((appRef) => {
    // Dev-only perf probe: with `?perfprobe` in the URL, expose `window.__cd`, a
    // running count of Angular change-detection passes (one per
    // NgZone.onMicrotaskEmpty). Used by the perf harness
    // (dev-tools/perf-harness) to count CD passes during a gesture, and by the
    // draw/modify smoke test to assert an out-of-zone handler re-entered the
    // zone. No effect on a normal run.
    try {
      if (new URLSearchParams(window.location.search).has('perfprobe')) {
        const zone = appRef.injector.get(NgZone);
        const w = window as unknown as { __cd: number };
        w.__cd = 0;
        zone.onMicrotaskEmpty.subscribe(() => {
          w.__cd++;
        });
      }
    } catch {
      // A probe must never break app startup.
    }
  })
  .catch((e) => console.log(e));
