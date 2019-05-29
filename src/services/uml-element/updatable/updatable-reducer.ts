import { Reducer } from 'redux';
import { DeleteAction, UMLElementActionTypes } from '../uml-element-types';
import { UpdatableActions, UpdatableActionTypes, UpdatableState } from './updatable-types';

export const UpdatableReducer: Reducer<UpdatableState, UpdatableActions | DeleteAction> = (state = [], action) => {
  switch (action.type) {
    case UpdatableActionTypes.UPDATE_START: {
      const { payload } = action;
      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case UpdatableActionTypes.UPDATE_END: {
      const { payload } = action;
      return state.filter(id => !payload.ids.includes(id));
    }
  }
  return state;
};
