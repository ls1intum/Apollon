import { Reducer } from 'redux';
import { RelationshipActions, RelationshipActionTypes } from './relationship-types';
import { ElementState } from '../element/element-types';

const initialState: ElementState = {};

export const RelationshipReducer: Reducer<ElementState, RelationshipActions> = (state = initialState, action) => {
  switch (action.type) {
    case RelationshipActionTypes.REDRAW: {
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
    case RelationshipActionTypes.CONNECT: {
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
