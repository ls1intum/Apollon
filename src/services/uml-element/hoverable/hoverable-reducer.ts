import { Reducer } from 'redux';
import { HoverableActions, HoverableActionTypes, HoverableState } from './hoverable-types';

export const HoverableReducer: Reducer<HoverableState, HoverableActions> = (state = [], action) => {
  switch (action.type) {
    case HoverableActionTypes.HOVER: {
      const { payload } = action;
      return [...new Set([...payload.ids, ...state])];
    }
    case HoverableActionTypes.LEAVE: {
      const { payload } = action;
      return state.filter(id => !payload.ids.includes(id));
    }
  }
  return state;
};
