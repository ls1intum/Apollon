import { Reducer } from 'redux';
import { Actions } from '../actions';
import { CopyActionTypes, CopyState } from './copy-types';

export const CopyReducer: Reducer<CopyState, Actions> = (state = [], action) => {
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
