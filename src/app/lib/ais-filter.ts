/**
 * The Vessels list filters (ship type, IMO only, buddies only, and the
 * per-vessel "Show in Map" checkboxes) that decide which AIS targets the
 * chart draws. Shared by the map layers and the Vessels list, so the list can
 * say how many vessels the chart actually shows.
 */

/** Sentinel entries in `aisTargetTypes` for the "IMO Only" and "Buddies Only" toggles. */
export const AIS_FILTER_IMO_ONLY = -999;
export const AIS_FILTER_BUDDIES_ONLY = -998;

export interface AisFilter {
  /** Vessel ids ticked in the list; null or undefined means all of them. */
  filterIds?: Array<string> | null;
  filterByShipType?: boolean;
  filterShipTypes?: Array<number>;
}

/** The target fields the filters read; any AIS target type fits. */
export interface AisFilterTarget {
  type?: { id?: number | null } | null;
  registrations?: object;
  buddy?: boolean;
}

/** Whether the chart draws the target with this id under the given filters. */
export function aisTargetShown(
  id: string,
  target: AisFilterTarget | undefined,
  filter: AisFilter
): boolean {
  const types = Array.isArray(filter.filterShipTypes)
    ? filter.filterShipTypes
    : null;
  const passesSentinels =
    (!types?.includes(AIS_FILTER_IMO_ONLY) ||
      'imo' in (target?.registrations ?? {})) &&
    (!types?.includes(AIS_FILTER_BUDDIES_ONLY) || target?.buddy === true);

  if (filter.filterByShipType && types) {
    const st = Math.floor((target?.type?.id ?? NaN) / 10) * 10;
    return types.includes(st) && passesSentinels;
  }
  if (Array.isArray(filter.filterIds)) {
    return filter.filterIds.includes(id) && passesSentinels;
  }
  return passesSentinels;
}
