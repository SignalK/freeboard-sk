import { RpcError, type MethodHandler } from 'signalk-plotterext-bus/host';
import { parseParams } from './method-params';

// The schema loads with the validator on the first call, keeping TypeBox out
// of the initial bundle.
const schemas = () => import('./resource-display-params');

/** The types Freeboard shows and hides one resource at a time. */
export type PerItemDisplayType = 'routes' | 'waypoints' | 'regions' | 'charts';

const PER_ITEM: readonly string[] = [
  'routes',
  'waypoints',
  'regions',
  'charts'
] satisfies PerItemDisplayType[];

export interface ResourceDisplayMethodsDeps {
  /** Show or hide these resources of a per-item type, leaving the rest alone. */
  setVisible: (
    type: PerItemDisplayType,
    ids: string[],
    visible: boolean
  ) => Promise<void>;
  /** Turn the notes layer on. Freeboard has no per-note display choice. */
  showNotes: () => void;
}

/**
 * Host method handlers for the `resources.display` capability —
 * `resources.show` / `resources.hide` on stored resources. Notes are a
 * whole-layer type here, so the spec's coarser-host rule applies: `show`
 * turns the layer on, `hide` is refused. Any other type is refused.
 */
export function createResourceDisplayMethods(
  deps: ResourceDisplayMethodsDeps
): Record<string, MethodHandler> {
  const handler =
    (visible: boolean): MethodHandler =>
    async (params) => {
      const { type, ids } = await parseParams(
        (await schemas()).DisplayParams,
        params,
        'resources.badRequest'
      );
      if (PER_ITEM.includes(type)) {
        await deps.setVisible(type as PerItemDisplayType, ids, visible);
        return {};
      }
      if (type === 'notes' && visible) {
        deps.showNotes();
        return {};
      }
      throw new RpcError(`Cannot ${visible ? 'show' : 'hide'} ${type}`, {
        reason: 'resources.typeNotSupported',
        data: { type }
      });
    };
  return {
    'resources.show': handler(true),
    'resources.hide': handler(false)
  };
}
