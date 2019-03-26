import { Reducer } from 'redux';
import { ActionTypes, Actions } from './types';
import { ElementState } from '../../services/element/element-types';
import Container from './Container';

const initialState: ElementState = {};

const Reducer: Reducer<ElementState, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.APPEND_CHILD: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!(container instanceof Container)) return state;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: [
            ...new Set([...container.ownedElements, payload.id].reverse()),
          ].reverse(),
        },
        [payload.id]: { ...state[payload.id], owner: payload.owner },
      };
    }
    case ActionTypes.REMOVE_CHILD: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!(container instanceof Container)) return state;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: container.ownedElements.filter(id => id != payload.id),
        },
        [payload.id]: { ...state[payload.id], owner: null },
      };
    }
  }
  return state;
};

export default Reducer;
