import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { UMLElementActionTypes } from '../../uml-element/uml-element-types';
import { ReconnectableActionTypes, ReconnectableState } from './reconnectable-types';

export const ReconnectableReducer: Reducer<ReconnectableState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case ReconnectableActionTypes.START: {
      const { payload } = action;

      return payload.ids.reduce<ReconnectableState>((ids, id) => ({ ...ids, [id]: payload.endpoint }), state);
    }
    case UMLElementActionTypes.DELETE:
    case ReconnectableActionTypes.END: {
      const { payload } = action;

      return Object.keys(state).reduce<ReconnectableState>(
        (ids, id) => ({
          ...ids,
          ...(!payload.ids.includes(id) && { [id]: state[id] }),
        }),
        {},
      );
    }
  }

  return state;
};
