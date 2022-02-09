import { Reducer } from 'redux';
import { Actions } from '../../actions.js';
import { UMLElementActionTypes } from '../uml-element-types.js';
import { ResizableActionTypes, ResizableState } from './resizable-types.js';

export const ResizableReducer: Reducer<ResizableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case ResizableActionTypes.START: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case ResizableActionTypes.END: {
      const { payload } = action;

      return state.filter((id) => !payload.ids.includes(id));
    }
  }

  return state;
};
