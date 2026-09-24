import {
  RPC_ERRORS,
  RpcError,
  type MethodHandler,
  type ResourceGroupApplyResult,
  type ResourceGroupType
} from 'signalk-plotterext-bus/host';
import { isValidGroup } from 'src/app/modules/skresources/components/groups/group-apply';
import type { SKResourceGroup } from 'src/app/modules/skresources/components/groups/groups.service';

/**
 * Host method handlers for the `resourceGroups` capability — apply a stored
 * resource group (`/resources/groups/{id}`) to Freeboard's display. Group CRUD
 * is not here: extensions use the server's resources API for that.
 *
 * A pure factory over injected accessors so the handlers are unit-testable
 * without the Angular host service, matching the {@link createChartMethods}
 * pattern; the service spreads the result into each extension context's method
 * table.
 */
export interface ResourceGroupMethodsDeps {
  /** Fetch the group document. Rejects with an HTTP error (`status`) on failure. */
  fetchGroup: (id: string) => Promise<unknown>;
  /**
   * Apply a fetched, validated group; resolves with the types that were
   * applied once the display has been refreshed.
   */
  applyGroup: (
    id: string,
    group: SKResourceGroup
  ) => Promise<ResourceGroupType[]>;
}

export function createResourceGroupMethods(
  deps: ResourceGroupMethodsDeps
): Record<string, MethodHandler> {
  const badRequest = (message: string) =>
    new RpcError(message, {
      code: RPC_ERRORS.INVALID_PARAMS,
      reason: 'resourceGroups.badRequest'
    });

  return {
    'resourceGroup.apply': async (
      params
    ): Promise<ResourceGroupApplyResult> => {
      const id = (params as { id?: unknown } | undefined)?.id;
      if (typeof id !== 'string' || id.length === 0) {
        throw badRequest('resourceGroup.apply requires a string id');
      }
      let group: unknown;
      try {
        group = await deps.fetchGroup(id);
      } catch (err) {
        // The resources API answers 404 both for an unknown group and when the
        // server has no `groups` collection at all — both are unknownId.
        const status = (err as { status?: unknown })?.status;
        throw status === 404
          ? new RpcError(`No resource group ${id}`, {
              reason: 'resourceGroups.unknownId'
            })
          : new RpcError(`Could not read resource group ${id}`, {
              reason: 'resourceGroups.fetchFailed',
              data: { message: (err as Error)?.message }
            });
      }
      if (!isValidGroup(group)) {
        throw badRequest(
          `Resource group ${id} has a list that is not an array of ids`
        );
      }
      return { applied: await deps.applyGroup(id, group as SKResourceGroup) };
    }
  };
}
