import { describe, expect, it } from 'vitest';

import { CapabilityManifest, ControlDef } from './radar-api.service';
import {
  controlOptions,
  controlSections,
  controlWidget,
  nextPowerValue,
  powerState,
  rangeOptions
} from './radar-controls';

// Control definitions as a Furuno DRS4D-NXT reports them through MaYaRa
const power: ControlDef = {
  id: 0,
  name: 'Power',
  description: 'Radar operational state',
  category: 'base',
  dataType: 'enum',
  minValue: 0,
  maxValue: 4,
  descriptions: {
    0: 'Off',
    1: 'Standby',
    2: 'Transmit',
    3: 'Preparing',
    4: 'Fault'
  },
  validValues: [1, 2]
};
const doppler: ControlDef = {
  id: 9,
  name: 'Doppler',
  description: 'Doppler mode',
  category: 'base',
  dataType: 'enum',
  minValue: 0,
  maxValue: 2,
  descriptions: { 0: 'Off', 1: 'Target', 2: 'Rain' }
};
const gain: ControlDef = {
  id: 4,
  name: 'Gain',
  description: 'How sensitive the radar is to returning echoes',
  category: 'base',
  dataType: 'number',
  hasAuto: true,
  minValue: 0,
  maxValue: 100,
  stepValue: 1
};
const controls: Record<string, ControlDef> = {
  power,
  range: {
    id: 2,
    name: 'Range',
    description: 'Maximum distance shown',
    category: 'base',
    dataType: 'number',
    units: 'm',
    descriptions: { 1852: '1 nm', 926: '1/2 nm' }
  },
  gain,
  doppler,
  guardZone1: {
    id: 11,
    name: 'Guard zone',
    description: 'First guard zone',
    category: 'targets',
    dataType: 'zone',
    hasEnabled: true
  },
  clearTargets: {
    id: 15,
    name: 'Clear targets',
    description: 'Clear all targets',
    category: 'targets',
    dataType: 'button'
  },
  targetTrails: {
    id: 24,
    name: 'Target trails',
    description: 'Target trail duration',
    category: 'trails',
    dataType: 'enum',
    maxValue: 6,
    descriptions: {
      0: 'Off',
      1: '15s',
      2: '30s',
      3: '1 min',
      4: '3 min',
      5: '5 min',
      6: '10 min'
    }
  },
  noiseRejection: {
    id: 29,
    name: 'Noise rejection',
    description: 'Noise rejection',
    category: 'advanced',
    dataType: 'enum',
    maxValue: 1,
    descriptions: { 0: 'Off', 1: 'On' }
  },
  birdMode: {
    id: 35,
    name: 'Bird mode',
    description: 'Bird mode',
    category: 'base',
    dataType: 'enum',
    maxValue: 3,
    descriptions: { 0: 'Off', 1: 'Low', 2: 'Medium', 3: 'High' }
  },
  tune: {
    id: 38,
    name: 'Tune',
    description: 'Tune',
    category: 'advanced',
    dataType: 'number',
    hasAuto: true,
    minValue: 0,
    maxValue: 2000,
    stepValue: 1
  },
  antennaHeight: {
    id: 50,
    name: 'Antenna height',
    description: 'Antenna height above the waterline',
    category: 'installation',
    dataType: 'number',
    minValue: 0,
    maxValue: 30,
    stepValue: 1,
    units: 'm'
  },
  operatingTime: {
    id: 57,
    name: 'Operating time',
    description: 'Time the radar has been powered on',
    category: 'info',
    dataType: 'number',
    units: 's',
    isReadOnly: true
  },
  userName: {
    id: 65,
    name: 'Custom name',
    description: 'User defined name',
    category: 'info',
    dataType: 'string'
  }
};
const capabilities = {
  supportedRanges: [1852, 115, 926],
  controls
} as unknown as CapabilityManifest;

describe('radar controlSections()', () => {
  it('groups the controls by category, in id order, as MaYaRa does', () => {
    const sections = controlSections(capabilities);

    expect(sections.map((s) => s.title)).toEqual([
      'Base',
      'Targets',
      'Trails',
      'Advanced',
      'Installation',
      'Info'
    ]);
    expect(sections[0].controls.map((c) => c.id)).toEqual([
      'gain',
      'doppler',
      'birdMode'
    ]);
    expect(sections[3].controls.map((c) => c.id)).toEqual([
      'noiseRejection',
      'tune'
    ]);
  });

  it('leaves power and range to the panel header', () => {
    const ids = controlSections(capabilities).flatMap((s) =>
      s.controls.map((c) => c.id)
    );
    expect(ids).not.toContain('power');
    expect(ids).not.toContain('range');
  });

  it('has no sections before the capabilities are known', () => {
    expect(controlSections(undefined)).toEqual([]);
  });
});

describe('radar controlOptions()', () => {
  it('labels the valid values the radar lists', () => {
    expect(controlOptions(power)).toEqual([
      { value: 1, label: 'Standby' },
      { value: 2, label: 'Transmit' }
    ]);
  });

  it('falls back to the labelled values when there is no validValues list', () => {
    expect(controlOptions(doppler)).toEqual([
      { value: 0, label: 'Off' },
      { value: 1, label: 'Target' },
      { value: 2, label: 'Rain' }
    ]);
  });

  it('has no options for a plain number', () => {
    expect(controlOptions(gain)).toEqual([]);
  });
});

describe('radar controlWidget()', () => {
  it.each([
    ['gain', 'slider'],
    ['doppler', 'steps'],
    ['targetTrails', 'steps'],
    ['guardZone1', 'area'],
    ['clearTargets', 'button'],
    ['tune', 'number'],
    ['antennaHeight', 'number'],
    ['operatingTime', 'readonly'],
    ['userName', 'string']
  ])('shows %s as %s', (id, widget) => {
    expect(controlWidget(controls[id])).toBe(widget);
  });

  it('uses a drop-down once there are more than ten values', () => {
    const descriptions = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [i, `Mode ${i}`])
    );
    expect(controlWidget({ ...doppler, descriptions, maxValue: 10 })).toBe(
      'select'
    );
  });
});

describe('radar power', () => {
  it.each([
    [0, 'off'],
    [1, 'standby'],
    [2, 'transmit'],
    [3, 'preparing'],
    [4, 'fault'],
    [undefined, 'unknown']
  ])('reads power %s as %s', (value, state) => {
    expect(powerState(power, value)).toBe(state);
  });

  it('reads the state from the value when the radar gives no labels', () => {
    expect(powerState({ ...power, descriptions: undefined }, 2)).toBe(
      'transmit'
    );
  });

  it('transmits from standby and from off, and goes to standby from transmit', () => {
    expect(nextPowerValue(power, 1)).toBe(2);
    expect(nextPowerValue(power, 0)).toBe(2);
    expect(nextPowerValue(power, 2)).toBe(1);
  });

  it('does nothing while the radar is preparing, in fault or unreported', () => {
    expect(nextPowerValue(power, 3)).toBe(undefined);
    expect(nextPowerValue(power, 4)).toBe(undefined);
    expect(nextPowerValue(power, undefined)).toBe(undefined);
  });

  it('offers nothing the radar does not accept', () => {
    expect(nextPowerValue({ ...power, validValues: [0, 1] }, 1)).toBe(
      undefined
    );
    expect(nextPowerValue({ ...power, isReadOnly: true }, 1)).toBe(undefined);
    expect(nextPowerValue(undefined, 1)).toBe(undefined);
  });
});

describe('radar rangeOptions()', () => {
  it('lists the supported ranges nearest first, with the radar labels', () => {
    expect(rangeOptions(capabilities)).toEqual([
      { value: 115, label: '' },
      { value: 926, label: '1/2 nm' },
      { value: 1852, label: '1 nm' }
    ]);
  });
});
