import { Reducer } from 'redux';
import { ElementState, ActionTypes } from './types';
import { Actions } from './repository';
import { Element } from './../../core/domain';

const initialState: ElementState = {};

const ElementReducer: Reducer<ElementState, Actions> = (
  state: ElementState = initialState,
  action: Actions
): ElementState => {
  switch (action.type) {
    case ActionTypes.SELECT:
      return {
        ...state,
        [action.element.id]: { selected: true },
      };
    case ActionTypes.DESELECT:
      return {
        ...state,
        [action.element.id]: { selected: false },
      };
  }
  return state;
};

export default ElementReducer;
