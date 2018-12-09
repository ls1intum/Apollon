import { Reducer } from 'redux';
import { ElementState, ActionTypes } from './types';
import { Actions } from './repository';
import Element from '.';

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
  }
  return state;
};

export default ElementReducer;
