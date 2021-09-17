import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { UMLElementActionTypes } from '../uml-element-types';
import { UpdatableActionTypes, UpdatableState } from './updatable-types';

export const UpdatableReducer: Reducer<UpdatableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case UpdatableActionTypes.START: {
      const { payload } = action;

      return [...new Set([...payload.ids, ...state])];
    }
    case UMLElementActionTypes.DELETE:
    case UpdatableActionTypes.END: {
      const { payload } = action;

      return state.filter((id) => !payload.ids.includes(id));
    }
    case UpdatableActionTypes.ENDALL:
      return [];
  }

  return state;
};
