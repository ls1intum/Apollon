import { Reducer } from 'redux';
import { Actions } from '../../actions.js';
import { UMLElementActionTypes } from '../uml-element-types.js';
import { SelectableActionTypes, SelectableState } from './selectable-types.js';

export const SelectableReducer: Reducer<SelectableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case SelectableActionTypes.SELECT: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case SelectableActionTypes.DESELECT: {
      const { payload } = action;

      return state.filter((id) => !payload.ids.includes(id));
    }
  }

  return state;
};
