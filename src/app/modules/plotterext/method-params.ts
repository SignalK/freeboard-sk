import type { Static, TSchema } from 'typebox';
import { RPC_ERRORS, RpcError } from 'signalk-plotterext-bus/host';

/**
 * Checks a method's params against its schema. Params that do not match are
 * refused as invalid, with the capability's `badRequest` reason and the first
 * failing field in the message.
 */
export async function parseParams<T extends TSchema>(
  schema: T,
  params: unknown,
  reason: string
): Promise<Static<T>> {
  const { Check, Errors } = await import('typebox/value');
  if (Check(schema, params)) {
    return params;
  }
  const [error] = Errors(schema, params);
  const message =
    error.keyword === 'required'
      ? `${error.instancePath}/${error.params.requiredProperties[0]} is required`
      : `${error.instancePath || 'params'} ${error.message}`;
  throw new RpcError(message, {
    code: RPC_ERRORS.INVALID_PARAMS,
    reason
  });
}
