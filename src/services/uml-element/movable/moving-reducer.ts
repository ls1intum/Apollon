import { Reducer } from 'redux';
import { MovingActions, MovingActionTypes, MovingState } from './moving-types';

export const MovingReducer: Reducer<MovingState, MovingActions> = (state = {}, action) => {
  switch (action.type) {
    case MovingActionTypes.MOVE: {
      const { payload } = action;
      return payload.ids.reduce<MovingState>((newState, id) => {
        if (!newState[id]) {
          return newState;
        }

        return {
          ...newState,
          [id]: {
            ...newState[id],
            bounds: {
              ...newState[id].bounds,
              x: newState[id].bounds.x + payload.delta.x,
              y: newState[id].bounds.y + payload.delta.y,
            },
          },
        };
      }, state);
    }
  }
  return state;
};
