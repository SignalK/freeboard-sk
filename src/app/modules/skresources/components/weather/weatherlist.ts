import {
  Component,
  ChangeDetectionStrategy,
  output,
  inject
} from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AppFacade } from 'src/app/app.facade';

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
export class WeatherListComponent {
  closed = output<void>();

  protected app = inject(AppFacade);

  protected close() {
    this.closed.emit();
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
}
