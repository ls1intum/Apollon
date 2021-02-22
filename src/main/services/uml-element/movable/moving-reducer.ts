import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { MovingActionTypes, MovingState } from './moving-types';

export const MovingReducer: Reducer<MovingState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case MovingActionTypes.MOVE: {
      const { payload } = action;
      const elements = { ...state };
      payload.ids.forEach((id) => {
        if (id in elements) {
          elements[id] = {
            ...elements[id],
            bounds: {
              ...elements[id].bounds,
              x: elements[id].bounds.x + payload.delta.x,
              y: elements[id].bounds.y + payload.delta.y,
            },
          };
        }
      });
      return elements;
    }
  }

  return state;
};
