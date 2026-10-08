import { Component, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppFacade } from 'src/app/app.facade';
import {
  ControlChange,
  ControlDef,
  ControlValue,
  RadarAPIService
} from '../radar-api.service';
import {
  ControlOption,
  controlSections,
  ControlWidget,
  nextPowerValue,
  powerState,
  rangeOptions,
  SectionControl
} from '../radar-controls';

const AREA_TYPES = ['sector', 'zone', 'rect'];

@Component({
  selector: 'radar-panel',
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatTooltipModule
  ],
  templateUrl: `radar-panel.html`,
  styleUrl: `radar-panel.css`
})
export class RadarPanel {
  connect = output<void>();
  disconnect = output<void>();

  protected app = inject(AppFacade);
  protected radarApi = inject(RadarAPIService);

  protected radar = this.radarApi.radar;
  // the capabilities only change when another radar is selected, so the
  // sections are not rebuilt for every control update
  private capabilities = computed(() => this.radar()?.capabilities);
  protected sections = computed(() => controlSections(this.capabilities()));
  protected ranges = computed(() => rangeOptions(this.capabilities()));
  protected values = computed(
    () => this.radar()?.controls ?? new Map<string, ControlValue>()
  );

  private powerDef = computed(() => this.capabilities()?.controls?.['power']);
  private powerValue = computed(() => this.values().get('power')?.value);
  protected power = computed(() =>
    powerState(this.powerDef(), this.powerValue())
  );
  protected powerLabel = computed(() => {
    const value = this.powerValue();
    if (value === undefined || value === null) {
      return '';
    }
    return this.powerDef()?.descriptions?.[value] ?? String(value);
  });
  protected nextPower = computed(() =>
    this.values().get('power')?.allowed === false
      ? undefined
      : nextPowerValue(this.powerDef(), this.powerValue())
  );

  protected rangeDef = computed(() => this.capabilities()?.controls?.['range']);
  protected rangeValue = computed(() => this.values().get('range')?.value);

  ngOnDestroy() {
    this.app.saveConfig();
  }

  protected toggleOverlay() {
    if (this.app.uiCtrl().radarLayer) {
      this.disconnect.emit();
    } else {
      this.connect.emit();
    }
  }

  protected selectRadar(id: string) {
    if (id !== this.radar()?.device?.id) {
      this.radarApi.init(id);
    }
  }

  protected togglePower() {
    const next = this.nextPower();
    if (next !== undefined) {
      this.send('power', { value: next });
    }
  }

  protected opacityPercent() {
    return `${Math.round(this.app.config.radars.opacity * 100)}%`;
  }

  protected handleOpacity(e: Event) {
    this.app.config.radars.opacity = Number(
      (e.target as HTMLInputElement).value
    );
  }

  /** Set a control's value, or its auto adjustment while it is on auto. */
  protected setValue(c: SectionControl, value: number | string) {
    const cv = this.values().get(c.id);
    if (!c.def.hasAuto) {
      this.send(c.id, { value });
    } else if (cv?.auto && c.def.hasAutoAdjustable) {
      this.send(c.id, { auto: true, autoValue: value });
    } else {
      this.send(c.id, { auto: false, value });
    }
  }

  protected setAuto(c: SectionControl, auto: boolean) {
    this.send(c.id, { auto });
  }

  protected setStep(c: SectionControl, e: Event) {
    const option = c.options[(e.target as HTMLInputElement).valueAsNumber];
    if (option) {
      this.setValue(c, option.value);
    }
  }

  protected setNumber(c: SectionControl, e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value === '' || !Number.isFinite(input.valueAsNumber)) {
      return;
    }
    let value = input.valueAsNumber;
    const [min, max] = this.bounds(c.def, this.values().get(c.id));
    if (Number.isFinite(min)) value = Math.max(value, min);
    if (Number.isFinite(max)) value = Math.min(value, max);
    this.setValue(c, value);
  }

  protected setText(c: SectionControl, e: Event) {
    this.send(c.id, { value: (e.target as HTMLInputElement).value });
  }

  protected setRange(value: number | string) {
    this.send('range', { value });
  }

  protected press(c: SectionControl) {
    this.send(c.id, {});
  }

  private send(controlId: string, change: ControlChange) {
    this.radarApi
      .setControl(this.radar()?.device?.id, controlId, change)
      .catch((err) => this.app.parseHttpErrorResponse(err));
  }

  /** The slider bounds: the auto adjustment's while adjusting on auto. */
  protected bounds(
    def: ControlDef,
    cv: ControlValue | undefined
  ): [number, number] {
    const min = Number(def.minValue ?? 0);
    const max = Number(def.maxValue);
    if (cv?.auto && def.hasAutoAdjustable) {
      return [def.autoAdjustMinValue ?? min, def.autoAdjustMaxValue ?? max];
    }
    return [min, max];
  }

  /** The value a slider or field shows: the auto adjustment while on auto. */
  protected current(
    def: ControlDef,
    cv: ControlValue | undefined
  ): number | string | undefined {
    return cv?.auto && def.hasAutoAdjustable ? cv.autoValue : cv?.value;
  }

  /** A control on auto with nothing to adjust has no value to set. */
  protected onAuto(def: ControlDef, cv: ControlValue | undefined): boolean {
    return !!(def.hasAuto && cv?.auto && !def.hasAutoAdjustable);
  }

  protected isDisabled(def: ControlDef, cv: ControlValue | undefined) {
    return def.isReadOnly || cv?.allowed === false;
  }

  protected stepIndex(c: SectionControl, cv: ControlValue | undefined) {
    return c.options.findIndex((o) => o.value === cv?.value);
  }

  /** A slider has no position for a value the radar has not reported, or for
   *  one outside its steps, so such a control is shown as a drop-down or a
   *  field instead, rather than at a setting the radar is not at. */
  protected widgetFor(
    c: SectionControl,
    cv: ControlValue | undefined
  ): ControlWidget {
    if (c.widget === 'steps' && this.stepIndex(c, cv) < 0) {
      return 'select';
    }
    if (c.widget === 'slider' && typeof this.current(c.def, cv) !== 'number') {
      return 'number';
    }
    return c.widget;
  }

  /** The value text shown beside a control's name. A dash means the radar has
   *  not reported a value, rather than an invented one. */
  protected display(def: ControlDef, cv: ControlValue | undefined): string {
    if (AREA_TYPES.includes(def.dataType)) {
      return this.areaSummary(def, cv);
    }
    if (this.onAuto(def, cv)) {
      return '';
    }
    const value = this.current(def, cv);
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    // an auto adjustment is an offset, which the value labels do not describe
    if (cv?.auto && def.hasAutoAdjustable) {
      return `A${Number(value) > 0 ? '+' : ''}${value}`;
    }
    const label = def.descriptions?.[value];
    if (label) {
      return label;
    }
    return typeof value === 'number'
      ? this.formatNumber(value, def.units)
      : String(value);
  }

  protected rangeLabel(o: ControlOption) {
    return (
      o.label ||
      (typeof o.value === 'number'
        ? this.app.formatValueForDisplay(o.value, 'm')
        : o.value)
    );
  }

  private areaSummary(def: ControlDef, cv: ControlValue | undefined): string {
    if (!cv || (def.hasEnabled && cv.enabled !== true)) {
      return cv ? 'Off' : '—';
    }
    if (def.dataType === 'rect') {
      return 'On';
    }
    const angles = `${this.formatNumber(cv.value, 'rad')} to ${this.formatNumber(cv.endValue, 'rad')}`;
    return def.dataType === 'zone'
      ? `${angles}, ${this.formatNumber(cv.startDistance, 'm')} to ${this.formatNumber(cv.endDistance, 'm')}`
      : angles;
  }

  private formatNumber(
    value: number | string | undefined,
    units: string | undefined
  ): string {
    if (typeof value !== 'number') {
      return value === undefined ? '—' : String(value);
    }
    switch (units) {
      case 'm':
        return this.app.formatValueForDisplay(value, 'm', {
          category: 'length',
          precision: 0
        });
      case 'rad':
      case 'deg':
        return this.app.formatValueForDisplay(value, units, { precision: 0 });
      case 'm/s':
        return this.app.formatValueForDisplay(value, 'm/s');
      case 's':
        // formatValueForDisplay() shows a duration in whole minutes, which
        // would turn a 10-120 s setting into "0 min" or "1 min"
        return value < 3600
          ? `${value} s`
          : this.app.formatValueForDisplay(value, 's');
      default:
        return String(value);
    }
  }
}
