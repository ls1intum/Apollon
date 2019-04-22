import { Reducer } from 'redux';
import { ResizableActions, ResizableActionTypes, ResizableState } from './resizable-types';

export const ResizableReducer: Reducer<ResizableState, ResizableActions> = (state = [], action) => {
  switch (action.type) {
    case ResizableActionTypes.RESIZE_START: {
      const { payload } = action;
      return [...new Set([...payload.ids, ...state])];
    }
    case ResizableActionTypes.RESIZE_END: {
      const { payload } = action;
      return state.filter(id => !payload.ids.includes(id));
    }
  }
  return state;
};
