import { Component, effect, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';

import { AppFacade } from 'src/app/app.facade';
import { AppIconDef } from 'src/app/modules/icons';
import { ActiveRadar, RadarAPIService } from '../radar-api.service';

@Component({
  selector: 'radar-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatSliderModule
  ],
  templateUrl: `radar-panel.html`,
  styles: [
    `
      .kvRow {
        display: flex;
        flex-direction: row;
        padding-left: 5px;
        padding-top: 15px;
      }
    `
  ]
})
export class RadarPanel {
  radar = input<ActiveRadar>();
  id = input<string>(undefined);
  connect = output<void>();
  disconnect = output<void>();

  protected icon: AppIconDef;
  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);

  protected forceReadOnly = false;

  constructor() {
    effect(() => {
      this.radar();
    });
  }

  ngOnDestroy() {
    this.app.saveConfig();
  }

  protected handleConnect(e: boolean) {
    if (e) {
      this.connect.emit();
    } else {
      this.disconnect.emit();
    }
  }

  protected handleOpacity(e: Event) {
    this.app.config.radars.opacity = Number(
      (e.target as HTMLInputElement).value
    );
  }

  protected handleControl(controlId: string, value: any) {
    console.log(controlId, value);
    this.radarApi
      .setControl(undefined, controlId, value)
      .catch((err) => this.app.parseHttpErrorResponse(err));
  }
}
