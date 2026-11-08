import { describe, expect, it } from 'vitest';
import { ALARM_STATE } from 'src/app/types/stream';
import { alertTier } from './alert-tier';

describe('alertTier', () => {
  it('shows any emergency as a card', () => {
    expect(
      alertTier({ priority: ALARM_STATE.emergency, type: 'notification' })
    ).toBe('card');
  });

  it('shows a standard alarm as a card whatever its state', () => {
    expect(alertTier({ priority: ALARM_STATE.alarm, type: 'mob' })).toBe(
      'card'
    );
    expect(alertTier({ priority: ALARM_STATE.warn, type: 'fire' })).toBe(
      'card'
    );
  });

  it('shows a closest approach as a card from alarm on, otherwise only on the button', () => {
    expect(alertTier({ priority: ALARM_STATE.alarm, type: 'cpa' })).toBe(
      'card'
    );
    expect(alertTier({ priority: ALARM_STATE.warn, type: 'cpa' })).toBe(
      'button'
    );
  });

  it('shows another alarm as a row', () => {
    expect(
      alertTier({ priority: ALARM_STATE.alarm, type: 'notification' })
    ).toBe('row');
    expect(alertTier({ priority: ALARM_STATE.alarm, type: 'drift' })).toBe(
      'row'
    );
  });

  it('shows a route arrival as a row, for its next point action', () => {
    expect(
      alertTier({ priority: ALARM_STATE.alert, type: 'arrivalCircleEntered' })
    ).toBe('row');
    expect(
      alertTier({ priority: ALARM_STATE.warn, type: 'perpendicularPassed' })
    ).toBe('row');
  });

  it('shows warnings and alerts only on the button', () => {
    expect(
      alertTier({ priority: ALARM_STATE.warn, type: 'notification' })
    ).toBe('button');
    expect(
      alertTier({ priority: ALARM_STATE.alert, type: 'notification' })
    ).toBe('button');
    expect(alertTier({ priority: ALARM_STATE.warn })).toBe('button');
  });
});
