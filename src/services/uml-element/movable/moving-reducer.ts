import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { MovingActionTypes, MovingState } from './moving-types';

export const MovingReducer: Reducer<MovingState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case MovingActionTypes.END: {
      const { payload } = action;

      return {
        ...state,
        ...payload.elements.reduce((elements, element) => ({ ...elements, [element.id]: element }), {}),
      };
    }
  }

  return state;
};
