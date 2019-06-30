import { AsyncAction } from '../../../utils/actions/actions';
import { filterRoots } from '../../../utils/geometry/tree';
import { MovableActionTypes, MoveEndAction, MoveStartAction } from './movable-types';
import { MoveAction, MovingActionTypes } from './moving-types';

export const Movable = {
  startMoving: (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : filterRoots(selected, elements);
    if (!ids.length) {
      return;
    }

    dispatch<MoveStartAction>({
      type: MovableActionTypes.START,
      payload: { ids },
    });
  },

  move: (delta: { x: number; y: number }, id?: string | string[]): AsyncAction => (dispatch, getState) => {
    const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
    if (!ids.length) {
      return;
    }

    dispatch<MoveAction>({
      type: MovingActionTypes.MOVE,
      payload: { ids, delta },
    });
  },

  endMoving: (id?: string | string[], keyboard = false): AsyncAction => (dispatch, getState) => {
    const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
    if (!ids.length) {
      return;
    }

    dispatch<MoveEndAction>({
      type: MovableActionTypes.END,
      payload: { ids, keyboard },
    });
  },
};
