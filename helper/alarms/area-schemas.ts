import { Type, type Static, type TSchema } from 'typebox';
import { Value } from 'typebox/value';

export const PositionSchema = Type.Object({
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 })
});

const AreaTriggerSchema = Type.Enum(['entry', 'exit'], { default: 'entry' });

// Picks the body schema below; geometry and trigger may be left out.
const AreaHeaderSchema = Type.Object({
  geometry: Type.Enum(['polygon', 'circle', 'region'], { default: 'polygon' }),
  trigger: AreaTriggerSchema
});

const CircleAreaBodySchema = Type.Object({
  geometry: Type.Literal('circle'),
  trigger: AreaTriggerSchema,
  center: PositionSchema,
  // An entry alarm can never fire inside a circle of zero or negative radius.
  radius: Type.Number({ exclusiveMinimum: 0 }),
  name: Type.Optional(Type.String())
});

const PolygonAreaBodySchema = Type.Object({
  geometry: Type.Literal('polygon'),
  trigger: AreaTriggerSchema,
  coords: Type.Array(PositionSchema, { minItems: 1 }),
  name: Type.Optional(Type.String())
});

// The area itself comes from the region resource named in the request path.
const RegionAreaBodySchema = Type.Object({
  geometry: Type.Literal('region'),
  trigger: AreaTriggerSchema,
  name: Type.Optional(Type.String())
});

const AREA_BODY_SCHEMAS = {
  circle: CircleAreaBodySchema,
  polygon: PolygonAreaBodySchema,
  region: RegionAreaBodySchema
};

export type AreaAlarmBody =
  | Static<typeof CircleAreaBodySchema>
  | Static<typeof PolygonAreaBodySchema>
  | Static<typeof RegionAreaBodySchema>;

function assertValid<T extends TSchema>(
  schema: T,
  value: unknown
): asserts value is Static<T> {
  if (!Value.Check(schema, value)) {
    const [error] = Value.Errors(schema, value);
    throw new Error(
      `Area alarm is invalid: ${error.instancePath || 'body'} ${error.message}`
    );
  }
}

/**
 * Validate an area alarm request body
 * @param body request body (untrusted)
 * @returns the body with defaults applied and unknown fields removed
 * @throws Error naming the first invalid field
 */
export const parseAreaBody = (body: unknown): AreaAlarmBody => {
  const value: unknown = Value.Default(AreaHeaderSchema, Value.Clone(body));
  assertValid(AreaHeaderSchema, value);
  const schema = AREA_BODY_SCHEMAS[value.geometry];
  assertValid(schema, value);
  return Value.Clean(schema, value) as AreaAlarmBody;
};
