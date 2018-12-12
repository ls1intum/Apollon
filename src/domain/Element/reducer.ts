import { Reducer } from 'redux';
import { ElementState, ActionTypes } from './types';
import { Actions } from './repository';

const initialState: ElementState = {};

const ElementReducer: Reducer<ElementState, Actions> = (
  state: ElementState = initialState,
  action: Actions
): ElementState => {
  switch (action.type) {
    case ActionTypes.CREATE:
      return {
        ...state,
        [action.element.id]: { ...action.element },
      };
    case ActionTypes.UPDATE:
      return {
        ...state,
        [action.element.id]: { ...action.element },
      };
    case ActionTypes.DELETE:
      return Object.keys(state)
        .filter(key => key !== action.element.id)
        .reduce((acc, key) => ({ ...acc, [key]: state[key] }), {});
  }
  return state;
};

export default ElementReducer;
