import { Reducer } from 'redux';
import { Actions } from '../../actions.js';
import { UMLElementActionTypes } from '../uml-element-types.js';
import { MovableActionTypes, MovableState } from './movable-types.js';

export const MovableReducer: Reducer<MovableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case MovableActionTypes.START: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case MovableActionTypes.END: {
      const { payload } = action;

      return state.filter((id) => !payload.ids.includes(id));
    }
  }

  return state;
};
