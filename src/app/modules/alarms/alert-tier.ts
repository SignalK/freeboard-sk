import { ALARM_STATE } from 'src/app/types/stream';

/** The Signal K standard alarms, raised at `notifications.<type>`. */
export const STANDARD_ALARM_TYPES: ReadonlySet<string> = new Set([
  'mob',
  'sinking',
  'fire',
  'piracy',
  'flooding',
  'collision',
  'grounding',
  'listing',
  'adrift',
  'abandon',
  'aground'
]);

/** Alerts that offer to move on along the active route. */
const ROUTE_ARRIVAL_TYPES: ReadonlySet<string> = new Set([
  'perpendicularPassed',
  'arrivalCircleEntered'
]);

/**
 * How prominently an alert shows over the map: a full card, a one-line row,
 * or only on the Alarms button. Only what needs acting on at once takes
 * space on the chart; the Alarms list holds every alert either way.
 */
export type AlertTier = 'card' | 'row' | 'button';

export function alertTier(alert: {
  priority: ALARM_STATE;
  type?: string;
}): AlertTier {
  const { priority, type } = alert;
  if (priority === ALARM_STATE.emergency) {
    return 'card';
  }
  if (type && STANDARD_ALARM_TYPES.has(type)) {
    return 'card';
  }
  if (type === 'cpa') {
    return priority === ALARM_STATE.alarm ? 'card' : 'button';
  }
  if (priority === ALARM_STATE.alarm) {
    return 'row';
  }
  if (type && ROUTE_ARRIVAL_TYPES.has(type)) {
    return 'row';
  }
  return 'button';
}
