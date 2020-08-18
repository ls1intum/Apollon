import { Reducer } from 'redux';
import { Actions } from '../actions';
import { CopyActionTypes, CopyState } from './copy-types';

/**
 * only uses for copy paste without clipboard
 * @param state
 * @param action
 * @constructor
 */
export const CopyReducer: Reducer<CopyState, Actions> = (state = [], action: Actions) => {
  switch (action.type) {
    case CopyActionTypes.COPY: {
      const { payload } = action;
      return payload;
    }
    case CopyActionTypes.PASTE: {
      return state;
    }
  }

  return state;
};
