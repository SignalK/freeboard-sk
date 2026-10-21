import { Type } from 'typebox';
import { BUTTON_COLOR_PATTERN } from './button-decorations';

// `actions.setVisibility` and `buttons.setVisibility`. An empty id list is a
// legal no-op batch.
export const SetVisibilityParams = Type.Object({
  ids: Type.Array(Type.String()),
  visible: Type.Boolean()
});

// `buttons.decorate`. Each decoration is optional and `null` resets it; the
// handler refuses a call that sets none of them.
export const DecorateButtonsParams = Type.Object({
  ids: Type.Array(Type.String()),
  style: Type.Optional(
    Type.Union([
      Type.Literal('normal'),
      Type.Literal('active'),
      Type.Literal('warning'),
      Type.Literal('alarm'),
      Type.Null()
    ])
  ),
  colors: Type.Optional(
    Type.Union([
      Type.Object({
        fg: Type.Optional(Type.String({ pattern: BUTTON_COLOR_PATTERN })),
        bg: Type.Optional(Type.String({ pattern: BUTTON_COLOR_PATTERN }))
      }),
      Type.Null()
    ])
  ),
  badge: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]))
});
