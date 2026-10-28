import { SKServerUnitPrefs } from '../types';

/**
 * The server units each of Freeboard's unit settings can take on. A server
 * preference outside these (e.g. statute miles for distance) is not applied.
 */
const SERVER_UNIT_CHOICES = {
  distance: ['kilometer', 'naut-mile'],
  depth: ['m', 'foot'],
  length: ['m', 'foot'],
  speed: ['kn', 'm/s', 'km/h', 'mph'],
  temperature: ['C', 'F']
} as const;

export type ServerUnitCategory = keyof typeof SERVER_UNIT_CHOICES;

/**
 * The server's preferred unit for a category, when Freeboard's unit setting
 * for that category can follow it.
 */
export function serverUnit<K extends ServerUnitCategory>(
  prefs: SKServerUnitPrefs | undefined,
  category: K
): (typeof SERVER_UNIT_CHOICES)[K][number] | undefined {
  const target = prefs?.categories?.[category]?.targetUnit;
  return (SERVER_UNIT_CHOICES[category] as readonly string[]).includes(
    target ?? ''
  )
    ? (target as (typeof SERVER_UNIT_CHOICES)[K][number])
    : undefined;
}
