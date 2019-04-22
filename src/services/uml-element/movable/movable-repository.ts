import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { MovableActionTypes, MoveAction, MoveEndAction, MoveStartAction } from './movable-types';

export function Movable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static moveStart = (id: string | string[]): MoveStartAction => ({
      type: MovableActionTypes.MOVE_START,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });

    static move = (id: string | string[], delta: { x: number; y: number }): MoveAction => ({
      type: MovableActionTypes.MOVE,
      payload: { ids: Array.isArray(id) ? id : [id], delta },
    });

    static moveSelection = (delta: { x: number; y: number }): AsyncAction => (dispatch, getState) =>
      dispatch({
        type: MovableActionTypes.MOVE,
        payload: { ids: getState().selected, delta },
      });

    static moveEnd = (id: string | string[]): MoveEndAction => ({
      type: MovableActionTypes.MOVE_END,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });
  };
}
