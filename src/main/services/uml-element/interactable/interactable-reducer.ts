import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { UMLElementActionTypes } from '../uml-element-types';
import { InteractableActionTypes, InteractableState } from './interactable-types';

export const InteractableReducer: Reducer<InteractableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case InteractableActionTypes.SELECT: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case InteractableActionTypes.DESELECT: {
      const { payload } = action;

      return state.filter((id) => !payload.ids.includes(id));
    }
  }

  return state;
};
