import { Type } from 'typebox';
import { isChartTimeInstant } from 'src/app/lib/chart-time';

// An empty id list is a legal no-op batch.
const ChartIds = Type.Array(Type.String({ minLength: 1 }));

export const SetVisibilityParams = Type.Object({
  ids: ChartIds,
  visible: Type.Boolean()
});

export const SetOpacityParams = Type.Object({
  ids: ChartIds,
  opacity: Type.Number({ minimum: 0, maximum: 1 })
});

export const SetTimeParams = Type.Object({
  ids: ChartIds,
  time: Type.Refine(
    Type.Union([Type.Null(), Type.String()]),
    (time) => time === null || isChartTimeInstant(time),
    () => 'must be null or an ISO 8601 instant'
  )
});

export const SetOrderParams = Type.Object({ order: ChartIds });
