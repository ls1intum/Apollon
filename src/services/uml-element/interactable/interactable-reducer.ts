import { Reducer } from 'redux';
import { InteractableActions, InteractableActionTypes, InteractableState } from './interactable-types';

const initialState: InteractableState = [];

export const InteractableReducer: Reducer<InteractableState, InteractableActions> = (state = initialState, action) => {
  switch (action.type) {
    case InteractableActionTypes.SELECT: {
      const { payload } = action;
      return [...new Set([payload.id, ...state])];
    }
    case InteractableActionTypes.DESELECT: {
      const { payload } = action;
      return state.filter(id => payload.id !== id);
    }
  }
  return state;
};
