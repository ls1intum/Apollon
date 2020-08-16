import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { ResizingActionTypes, ResizingState } from './resizing-types';

export const ResizingReducer: Reducer<ResizingState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case ResizingActionTypes.RESIZE: {
      const { payload } = action;

      return payload.ids.reduce<ResizingState>(
        (elements, id) => ({
          ...elements,
          ...(id in elements && {
            [id]: {
              ...elements[id],
              bounds: {
                ...elements[id].bounds,
                width: Math.max(elements[id].bounds.width + payload.delta.width, 0),
                height: Math.max(elements[id].bounds.height + payload.delta.height, 0),
              },
            },
          }),
        }),
        state,
      );
    }
  }

  return state;
};
