import { Reducer } from 'redux';
import { UMLElementActions, UMLElementActionTypes, UMLElementState } from './uml-element-types';

export const UMLElementReducer: Reducer<UMLElementState, UMLElementActions> = (state = {}, action) => {
  switch (action.type) {
    case UMLElementActionTypes.CREATE: {
      const { payload } = action;
      return payload.values.reduce<UMLElementState>(
        (elements, values) => ({ ...elements, [values.id]: values }),
        state,
      );
      // return { ...state, [payload.values.id]: { ...payload.values } };
    }
    case UMLElementActionTypes.UPDATE: {
      const { payload } = action;
      return payload.ids.reduce<UMLElementState>((newState, id) => {
        return {
          ...newState,
          [id]: {
            ...newState[id],
            ...payload.values,
          },
        };
      }, state);
    }
    case UMLElementActionTypes.DELETE: {
      const { payload } = action;
      return Object.assign(
        {},
        state,
        payload.ids.reduce<{ [id: string]: undefined }>((elements, id) => ({ ...elements, [id]: undefined }), {}),
      );
    }

    case UMLElementActionTypes.CHANGE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], type: payload.kind },
      };
    }
    case UMLElementActionTypes.RENAME: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], name: payload.name },
      };
    }
  }
  return state;
};
