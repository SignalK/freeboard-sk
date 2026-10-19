import { describe, expect, it } from 'vitest';
import { Type } from 'typebox';
import { RPC_ERRORS } from 'signalk-plotterext-bus/host';
import { parseParams } from './method-params';

describe('parseParams', () => {
  const Schema = Type.Object({
    ids: Type.Array(Type.String({ minLength: 1 })),
    opacity: Type.Number({ minimum: 0, maximum: 1 }),
    label: Type.Refine(
      Type.String(),
      (label) => label.trim().length > 0,
      () => 'must not be blank'
    )
  });
  const parse = (params: unknown) =>
    parseParams(Schema, params, 'things.badRequest');

  it('returns params that match the schema', async () => {
    const params = { ids: ['a'], opacity: 0.5, label: 'x', extra: true };
    await expect(parse(params)).resolves.toBe(params);
  });

  it.each([
    [undefined, 'params'],
    [{ ids: 'a', opacity: 0.5, label: 'x' }, '/ids'],
    [{ ids: ['a', ''], opacity: 0.5, label: 'x' }, '/ids/1'],
    [{ ids: [], opacity: 2, label: 'x' }, '/opacity'],
    [{ ids: [], opacity: NaN, label: 'x' }, '/opacity'],
    [{ ids: [], opacity: 0.5 }, '/label is required'],
    [{ label: 'x' }, '/ids is required'],
    [{ ids: [], opacity: 0.5, label: ' ' }, '/label must not be blank']
  ])('refuses %j naming %s', async (params, field) => {
    const error: unknown = await parse(params).catch((e: unknown) => e);
    expect(error).toMatchObject({
      code: RPC_ERRORS.INVALID_PARAMS,
      reason: 'things.badRequest'
    });
    expect((error as Error).message.startsWith(field)).toBe(true);
  });
});
