import { Reducer } from 'redux';
import { CopyActions, CopyActionTypes, CopyState } from './copy-types';

export const CopyReducer: Reducer<CopyState, CopyActions> = (state = [], action) => {
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
