import { LayoutAction, LayouterActionTypes } from './layouter-types.js';

export const LayouterRepository = {
  layout: (): LayoutAction => ({
    type: LayouterActionTypes.LAYOUT,
    payload: {},
    undoable: false,
  }),
};
