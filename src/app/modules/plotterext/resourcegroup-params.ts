import { Type } from 'typebox';

export const ApplyParams = Type.Object({ id: Type.String({ minLength: 1 }) });
