import { Reducer } from 'redux';
import { ResizingActions, ResizingActionTypes, ResizingState } from './resizing-types';

export const ResizingReducer: Reducer<ResizingState, ResizingActions> = (state = {}, action) => {
  switch (action.type) {
    case ResizingActionTypes.RESIZE: {
      const { payload } = action;
      return payload.ids.reduce<ResizingState>((newState, id) => {
        return {
          ...newState,
          [id]: {
            ...newState[id],
            bounds: {
              ...newState[id].bounds,
              width: Math.max(newState[id].bounds.width + payload.delta.width, 0),
              height: Math.max(newState[id].bounds.height + payload.delta.height, 0),
            },
          },
        };
      }, state);
    }
  }
  return state;
};
