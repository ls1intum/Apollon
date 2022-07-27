import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { ConnectionLayoutableActionTypes, ConnectionLayoutableState } from './connectionlayoutable-types';

export const ConnectionLayoutableReducer: Reducer<ConnectionLayoutableState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case ConnectionLayoutableActionTypes.START: {
      const { payload } = action;

      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          path: payload.path,
        },
      };
    }
  }

  return state;
};
