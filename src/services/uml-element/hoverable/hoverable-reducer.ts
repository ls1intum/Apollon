import { Reducer } from 'redux';
import { DeleteAction, UMLElementActionTypes } from '../uml-element-types';
import { HoverableActions, HoverableActionTypes, HoverableState } from './hoverable-types';

export const HoverableReducer: Reducer<HoverableState, HoverableActions | DeleteAction> = (state = [], action) => {
  switch (action.type) {
    case HoverableActionTypes.HOVER: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case HoverableActionTypes.LEAVE: {
      const { payload } = action;

      return state.filter(id => !payload.ids.includes(id));
    }
  }

  return state;
};
