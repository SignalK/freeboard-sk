import type { ResourceGroupType } from 'signalk-plotterext-bus/host';

/** The resource types a group carries an instruction for, in apply order. */
export const GROUP_TYPES: readonly ResourceGroupType[] = [
  'routes',
  'waypoints',
  'regions',
  'charts'
];

/** The selection lists a group writes — `config.selections` narrowed to them. */
export type GroupSelections = Partial<
  Record<ResourceGroupType, string[] | null>
>;

/**
 * Whether a group document is well-formed: every list that is present is an
 * array of strings. An absent list is fine (it means "leave that type alone");
 * `[]` is fine (it means "display none").
 */
export function isValidGroup(group: unknown): boolean {
  if (!group || typeof group !== 'object') {
    return false;
  }
  return GROUP_TYPES.every((type) => {
    const list = (group as Record<string, unknown>)[type];
    return (
      list === undefined ||
      (Array.isArray(list) && list.every((id) => typeof id === 'string'))
    );
  });
}

/**
 * Apply a group's lists to the selections, per the Plotter Extensions API
 * *Resource groups* contract: a list replaces that type's selection (`[]`
 * empties it, hiding the type); an absent list leaves the type untouched.
 * Each list is copied so the selection never aliases the group document.
 * @returns the types that were applied, in {@link GROUP_TYPES} order.
 */
export function applyGroupToSelections(
  group: Partial<Record<ResourceGroupType, unknown>>,
  selections: GroupSelections
): ResourceGroupType[] {
  const applied: ResourceGroupType[] = [];
  for (const type of GROUP_TYPES) {
    const list = group[type];
    if (Array.isArray(list)) {
      selections[type] = [...(list as string[])];
      applied.push(type);
    }
  }
  return applied;
}
