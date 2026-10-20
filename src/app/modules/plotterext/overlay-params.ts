import { Type } from 'typebox';
import { isImageBitmap } from './overlay-methods';

const Ids = Type.Array(Type.String(), { minItems: 1 });

export const SetVisibilityParams = Type.Object({
  ids: Ids,
  visible: Type.Boolean()
});

export const SetOpacityParams = Type.Object({
  ids: Ids,
  opacity: Type.Number({ minimum: 0, maximum: 1 })
});

export const FrameParams = Type.Object({
  image: Type.Unsafe<ImageBitmap>(
    Type.Refine(
      Type.Unknown(),
      isImageBitmap,
      () => 'must be a transferred ImageBitmap'
    )
  ),
  overlayId: Type.String(),
  requestId: Type.Optional(Type.String()),
  extent: Type.Refine(
    Type.Tuple([Type.Number(), Type.Number(), Type.Number(), Type.Number()]),
    ([minX, minY, maxX, maxY]) => maxX > minX && maxY > minY,
    () => 'must be [minX, minY, maxX, maxY] in EPSG:3857 with max > min'
  )
});

// The model checks the rest against what the overlay declared.
export const DataParams = Type.Object({ overlayId: Type.String() });
