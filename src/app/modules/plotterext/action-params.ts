import { Type } from 'typebox';

// `actions.setVisibility` and `buttons.setVisibility`. An empty id list is a
// legal no-op batch.
export const SetVisibilityParams = Type.Object({
  ids: Type.Array(Type.String()),
  visible: Type.Boolean()
});
