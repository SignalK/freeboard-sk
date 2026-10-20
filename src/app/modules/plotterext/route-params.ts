import { Type } from 'typebox';
import type { RoutePoint } from 'signalk-plotterext-bus/host';

const RouteId = Type.String({ minLength: 1 });

// [lon, lat] plus the bus's optional altitude, which may arrive as an explicit
// undefined.
const Position = Type.Unsafe<RoutePoint['position']>(
  Type.Array(Type.Union([Type.Number(), Type.Undefined()]), {
    minItems: 2,
    maxItems: 3,
    prefixItems: [Type.Number(), Type.Number()]
  })
);

const Point = Type.Object({
  position: Position,
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  href: Type.Optional(Type.String({ pattern: '^/resources/waypoints/[^/]+$' }))
});

// A route needs at least two points.
const Points = Type.Array(Point, { minItems: 2 });

export const RouteIdParams = Type.Object({ routeId: RouteId });

export const CreateParams = Type.Object({
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  points: Points
});

export const ReplaceParams = Type.Object({ routeId: RouteId, points: Points });

export const SaveParams = Type.Object({
  routeId: RouteId,
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  dialog: Type.Optional(Type.Boolean())
});

export const ShowParams = Type.Object({ ref: Type.String({ minLength: 1 }) });
