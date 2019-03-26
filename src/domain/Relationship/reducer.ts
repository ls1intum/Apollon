import { Reducer } from 'redux';
import { Actions, ActionTypes } from './types';
import { ElementState } from '../../services/element/element-types';

const initialState: ElementState = {};

const Reducer: Reducer<ElementState, Actions> = (state = initialState, action) => {
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
