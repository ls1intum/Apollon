import { LayoutAction, LayouterActionTypes } from './layouter-types';

export const LayouterRepository = {
  layout: (): LayoutAction => ({
    type: LayouterActionTypes.LAYOUT,
    payload: {},
    undoable: false,
  }),
};
