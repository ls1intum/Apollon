import { HoverableActionTypes, HoverAction, LeaveAction } from './hoverable-types';

export const Hoverable = {
  /** Hover elements */
  hover: (id: string | string[]): HoverAction => ({
    type: HoverableActionTypes.HOVER,
    payload: {
      ids: Array.isArray(id) ? id : [id],
    },
    undoable: false,
  }),

  /** Leave elements */
  leave: (id: string | string[]): LeaveAction => ({
    type: HoverableActionTypes.LEAVE,
    payload: {
      ids: Array.isArray(id) ? id : [id],
    },
    undoable: false,
  }),
};
