import { Reducer } from 'redux';
import { Actions, ActionTypes } from './types';
import { State } from '../Element/types';

const initialState: State = {};

const Reducer: Reducer<State, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.REDRAW: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          path: payload.path,
          bounds: payload.bounds,
        },
      };
    }
    case ActionTypes.CONNECT: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          ...(payload.source && { source: payload.source }),
          ...(payload.target && { target: payload.target }),
        },
      };
    }
    default:
      return state;
  }
};

export default Reducer;
