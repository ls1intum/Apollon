import { Reducer } from 'redux';
import { MovableActions, MovableActionTypes, MovableState } from './movable-types';

export const MovableReducer: Reducer<MovableState, MovableActions> = (state = [], action) => {
  switch (action.type) {
    case MovableActionTypes.MOVE_START: {
      const { payload } = action;
      return [...new Set([...payload.ids, ...state])];
    }
    case MovableActionTypes.MOVE_END: {
      const { payload } = action;
      return state.filter(id => !payload.ids.includes(id));
    }
  }
  return state;
};
