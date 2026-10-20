import { Type } from 'typebox';

export const SetParams = Type.Refine(
  Type.Object({
    enabled: Type.Optional(Type.Boolean()),
    auto: Type.Optional(Type.Boolean())
  }),
  (p) => p.enabled !== undefined || p.auto !== undefined,
  () => 'must set enabled, auto or both'
);
