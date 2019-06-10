import { Reducer } from 'redux';
import { ConnectableActions, ConnectableActionTypes, ConnectableState } from './connectable-types';

export const ConnectableReducer: Reducer<ConnectableState, ConnectableActions> = (state = [], action) => {
  switch (action.type) {
    case ConnectableActionTypes.CONNECT_START: {
      const { payload } = action;

      return [...new Set([...payload.ports, ...state])];
    }
    case ConnectableActionTypes.CONNECT_END: {
      const { payload } = action;

      return state.filter(port => !payload.ports.includes(port));
    }
  }

  return state;
};
