import { CapabilityManifest, ControlDef } from './radar-api.service';

// How a radar control is presented, chosen from its capability definition the
// way the MaYaRa radar GUI does it, so the same radar looks the same in both.
export type ControlWidget =
  | 'readonly'
  | 'button'
  | 'string'
  | 'area'
  | 'steps'
  | 'select'
  | 'slider'
  | 'number';

export type PowerState =
  'off' | 'standby' | 'transmit' | 'preparing' | 'fault' | 'unknown';

export interface ControlOption {
  value: number | string;
  label: string;
}

export interface SectionControl {
  id: string;
  def: ControlDef;
  widget: ControlWidget;
  options: ControlOption[];
}

export interface ControlSection {
  category: string;
  title: string;
  controls: SectionControl[];
}

// Power and range sit in the panel header, so they are left out of the
// sections the same way MaYaRa keeps them off its control list.
const HEADER_CONTROLS = ['power', 'range'];

// Steps up to this many values are a stepped slider; more is a drop-down.
const MAX_STEPS = 10;

// Units for which a 0-100 control is a measurement rather than a level, so it
// gets a value field instead of a slider.
const MEASURED_UNITS = ['m', 'm/s', 'deg'];

const POWER_STANDBY = 1;
const POWER_TRANSMIT = 2;
// the states the power button toggles from
const TOGGLE_STATES: PowerState[] = ['off', 'standby', 'transmit'];

/** Group the radar's controls by category, in id order, with each category
 *  placed where its first control falls. */
export function controlSections(
  capabilities: CapabilityManifest | undefined
): ControlSection[] {
  const sections: ControlSection[] = [];
  Object.entries(capabilities?.controls ?? {})
    .filter(([id]) => !HEADER_CONTROLS.includes(id))
    .sort(([, a], [, b]) => (a.id ?? 0) - (b.id ?? 0))
    .forEach(([id, def]) => {
      const category = def.category || 'base';
      let section = sections.find((s) => s.category === category);
      if (!section) {
        section = {
          category,
          title: category.charAt(0).toUpperCase() + category.slice(1),
          controls: []
        };
        sections.push(section);
      }
      section.controls.push({
        id,
        def,
        widget: controlWidget(def),
        options: controlOptions(def)
      });
    });
  return sections;
}

/** The values an enumerated control can be set to, with their labels. A
 *  radar may list `validValues`, or only label every value in
 *  `descriptions`. */
export function controlOptions(def: ControlDef): ControlOption[] {
  const label = (v: number | string) => def.descriptions?.[v] ?? String(v);
  if (def.validValues?.length) {
    return def.validValues.map((value) => ({ value, label: label(value) }));
  }
  if (def.descriptions) {
    return Object.keys(def.descriptions)
      .map((k) => (Number.isNaN(Number(k)) ? k : Number(k)))
      .sort((a, b) =>
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a).localeCompare(String(b))
      )
      .map((value) => ({ value, label: label(value) }));
  }
  return [];
}

/** Pick the widget for a control from its definition. */
export function controlWidget(def: ControlDef): ControlWidget {
  if (def.isReadOnly) {
    return 'readonly';
  }
  switch (def.dataType) {
    case 'button':
      return 'button';
    case 'string':
      return 'string';
    case 'sector':
    case 'zone':
    case 'rect':
      return 'area';
  }
  const options = controlOptions(def);
  if (def.dataType === 'enum' || options.length) {
    if (options.length > 0 && options.length <= MAX_STEPS) {
      return 'steps';
    }
    if (options.length) {
      return 'select';
    }
  }
  const max = Number(def.maxValue);
  if (
    Number.isFinite(max) &&
    max <= 100 &&
    !MEASURED_UNITS.includes(def.units ?? '')
  ) {
    return 'slider';
  }
  return 'number';
}

/** The power state a `power` control value stands for. */
export function powerState(
  def: ControlDef | undefined,
  value: number | string | undefined
): PowerState {
  if (value === undefined || value === null) {
    return 'unknown';
  }
  const label = def?.descriptions?.[value]?.toLowerCase();
  const states: PowerState[] = [
    'off',
    'standby',
    'transmit',
    'preparing',
    'fault'
  ];
  if (label && (states as string[]).includes(label)) {
    return label as PowerState;
  }
  return states[Number(value)] ?? 'unknown';
}

/** The power value the power button sets: Transmit from Off or Standby,
 *  Standby from Transmit. It never switches the radar Off: like the MaYaRa
 *  GUI, powering a radar down stays a deliberate act elsewhere. Undefined
 *  while the radar is preparing, in fault or has not reported its state,
 *  and when it does not accept the value. */
export function nextPowerValue(
  def: ControlDef | undefined,
  value: number | string | undefined
): number | undefined {
  const state = powerState(def, value);
  if (!def || def.isReadOnly || !TOGGLE_STATES.includes(state)) {
    return undefined;
  }
  const next = state === 'transmit' ? POWER_STANDBY : POWER_TRANSMIT;
  if (def.validValues?.length && !def.validValues.includes(next)) {
    return undefined;
  }
  return next;
}

/** The ranges the radar supports, nearest first, with the radar's own label
 *  for each where it has one. */
export function rangeOptions(
  capabilities: CapabilityManifest | undefined
): ControlOption[] {
  const def = capabilities?.controls?.['range'];
  return [...(capabilities?.supportedRanges ?? [])]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: def?.descriptions?.[value] ?? '' }));
}
