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
    }
    case UMLElementActionTypes.UPDATE: {
      const { payload } = action;

      return payload.values.reduce<UMLElementState>(
        (elements, values) => ({
          ...elements,
          [values.id]: {
            ...elements[values.id],
            ...values,
          },
        }),
        state,
      );
    }
    case UMLElementActionTypes.DELETE: {
      const { payload } = action;

      return Object.keys(state).reduce<UMLElementState>(
        (elements, id) => ({
          ...elements,
          ...(!payload.ids.includes(id) && { [id]: state[id] }),
        }),
        {},
      );
    }
  }

  return state;
};
