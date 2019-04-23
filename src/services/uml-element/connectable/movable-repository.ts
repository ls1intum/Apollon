import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { MovableActionTypes, MoveEndAction, MoveStartAction } from './movable-types';
import { MoveAction, MovingActionTypes } from './moving-types';

export function Movable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static startMoving = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      if (!ids.length) {
        return;
      }

      dispatch<MoveStartAction>({
        type: MovableActionTypes.MOVE_START,
        payload: { ids },
      });
    };

    static move = (delta: { x: number; y: number }, id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
      if (!ids.length) {
        return;
      }

      dispatch<MoveAction>({
        type: MovingActionTypes.MOVE,
        payload: { ids, delta },
      });
    };

    static endMoving = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
      if (!ids.length) {
        return;
      }

      dispatch<MoveEndAction>({
        type: MovableActionTypes.MOVE_END,
        payload: { ids },
      });
    };
  };
}
