/**
 * Utility functions for working with WMS/WMTS dimensions
 */

export interface DimensionValue {
  raw: string;
  parsed?: Date;
  isDate: boolean;
}

/**
 * Parse a dimension value string and return both raw and parsed forms
 */
export function parseDimensionValue(value: string): DimensionValue {
  if (!value) {
    return { raw: value, isDate: false };
  }

  // Try to parse as ISO date
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return {
          raw: value,
          parsed: parsed,
          isDate: true
        };
      }
    } catch {
      // Fall through to return raw string
    }
  }

  return { raw: value, isDate: false };
}

/**
 * Parse an array of dimension values
 */
export function parseDimensionValues(values: string[]): DimensionValue[] {
  return values.map(v => parseDimensionValue(v));
}

/**
 * Format a dimension value for display
 */
export function formatDimensionValue(value: string): string {
  const parsed = parseDimensionValue(value);
  if (parsed.isDate && parsed.parsed) {
    return parsed.parsed.toLocaleString();
  }
  return parsed.raw;
}

/**
 * Get time values sorted chronologically
 */
export function sortTimeValues(values: string[]): string[] {
  const parsed = values.map(v => ({
    raw: v,
    date: new Date(v)
  }));
  
  // Sort by date
  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return parsed.map(p => p.raw);
}

/**
 * Find the closest time value to a target date
 */
export function findClosestTime(values: string[], target: Date): string | null {
  if (!values || values.length === 0) return null;
  
  const targetTime = target.getTime();
  let closest = values[0];
  let closestDiff = Math.abs(new Date(values[0]).getTime() - targetTime);
  
  for (let i = 1; i < values.length; i++) {
    const diff = Math.abs(new Date(values[i]).getTime() - targetTime);
    if (diff < closestDiff) {
      closest = values[i];
      closestDiff = diff;
    }
  }
  
  return closest;
}
