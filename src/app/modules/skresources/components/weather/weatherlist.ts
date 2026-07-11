import {
  Component,
  ChangeDetectionStrategy,
  output,
  inject,
  NgZone,
  OnDestroy
} from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AppFacade } from 'src/app/app.facade';
import { TidalCurrentsService } from 'src/app/modules/map/ol/lib/tidal-currents.service';

@Component({
  selector: 'weather-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weatherlist.html',
  styleUrls: ['../resourcelist.css'],
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSlideToggleModule
  ]
})
export class WeatherListComponent implements OnDestroy {
  closed = output<void>();

  protected app = inject(AppFacade);
  protected currents = inject(TidalCurrentsService);
  private ngZone = inject(NgZone);

  private dragState: {
    startX: number;
    barWidth: number;
    startTime: number;
    isDragging: boolean;
    elLeft: number;
  } | null = null;

  private onDocPointerMove = (e: PointerEvent) => {
    if (!this.dragState) return;
    const dx = e.clientX - this.dragState.startX;

    if (!this.dragState.isDragging && Math.abs(dx) > 3) {
      this.dragState.isDragging = true;
    }

    if (this.dragState.isDragging) {
      const hours = -(dx / this.dragState.barWidth) * 24;
      this.currents.scrubTime.set(this.dragState.startTime + hours * 3600_000);
    }
  };

  private onDocPointerUp = (e: PointerEvent) => {
    if (!this.dragState) return;

    if (!this.dragState.isDragging) {
      const percent =
        (e.clientX - this.dragState.elLeft) / this.dragState.barWidth;
      const hourOffset = (percent - 0.5) * 24;
      const newTime = this.dragState.startTime + hourOffset * 3600_000;
      this.currents.scrubTime.set(newTime);
    }

    this.dragState = null;
    document.removeEventListener('pointermove', this.onDocPointerMove);
    document.removeEventListener('pointerup', this.onDocPointerUp);
    this.currents.dragEnd$.next();
  };

  ngOnDestroy() {
    if (this.dragState) {
      document.removeEventListener('pointermove', this.onDocPointerMove);
      document.removeEventListener('pointerup', this.onDocPointerUp);
    }
    this.currents.pause();
  }

  protected close() {
    this.closed.emit();
  }

  protected fmtScrubTime(): string {
    const t = this.currents.scrubTime();
    const d = t ? new Date(t) : new Date();
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    let day: string;
    if (isToday) day = 'Today';
    else if (isTomorrow) day = 'Tomorrow';
    else if (isYesterday) day = 'Yesterday';
    else
      day = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    const p = (n: number) => String(n).padStart(2, '0');
    return `${day} · ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /** Position (0-100) of "now" within the current 24h bar window, or null if now is at center. */
  protected nowTickPct(): number | null {
    const st = this.currents.scrubTime();
    if (st === null) return null;
    const pct = 50 + ((Date.now() - st) / (24 * 3600_000)) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }

  // ---- pointer drag handlers for the time bar ----

  protected onBarPointerDown(e: PointerEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    this.dragState = {
      startX: e.clientX,
      barWidth: rect.width,
      startTime: this.currents.scrubTime() ?? Date.now(),
      isDragging: false,
      elLeft: rect.left
    };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointermove', this.onDocPointerMove);
      document.addEventListener('pointerup', this.onDocPointerUp);
    });
  }

  protected toggleWeatherWind(checked: boolean) {
    if (!this.app.config?.selections) {
      return;
    }
    this.app.config.selections.weatherWindEnabled = checked;
    this.app.saveConfig();
  }

  protected toggleOceanCurrents(checked: boolean) {
    if (!this.app.config?.selections) {
      return;
    }
    this.app.config.selections.oceanCurrentsEnabled = checked;
    this.app.saveConfig();
  }

  protected toggleTidalCurrents(checked: boolean) {
    if (!this.app.config?.selections) {
      return;
    }
    if (!checked) {
      this.currents.pause();
    }
    this.app.config.selections.tidalCurrentsEnabled = checked;
    this.app.saveConfig();
  }
}
