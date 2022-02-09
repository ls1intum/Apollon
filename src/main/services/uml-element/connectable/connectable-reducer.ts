import { Reducer } from 'redux';
import { Actions } from '../../actions.js';
import { UMLElementActionTypes } from '../uml-element-types.js';
import { ConnectableActionTypes, ConnectableState } from './connectable-types.js';

export const ConnectableReducer: Reducer<ConnectableState, Actions> = (state = [], action) => {
  switch (action.type) {
    case ConnectableActionTypes.START: {
      const { payload } = action;

      return [...new Set([...payload.ports, ...state])];
    }
    case ConnectableActionTypes.END: {
      const { payload } = action;

      return state.filter((port) => !payload.ports.includes(port));
    }
    case UMLElementActionTypes.DELETE: {
      const { payload } = action;

      return state.reduce<ConnectableState>(
        (ports, port) => ({
          ...ports,
          ...(!payload.ids.includes(port.element) && port),
        }),
        [],
      );
    }
  }

  return state;
};
