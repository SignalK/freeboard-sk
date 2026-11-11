import { Type } from 'typebox';

export const DisplayParams = Type.Object({
  type: Type.String({ minLength: 1 }),
  ids: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })
});
