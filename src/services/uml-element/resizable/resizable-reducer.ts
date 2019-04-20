import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element-types';
import { ResizableActions, ResizableActionTypes } from './resizable-types';

const initialState: UMLElementState = {};

export const ResizableReducer: Reducer<UMLElementState, ResizableActions> = (state = initialState, action) => {
  switch (action.type) {
    case ResizableActionTypes.RESIZE: {
      const { payload } = action;
      return payload.ids.reduce<UMLElementState>((newState, id) => {
        return {
          ...newState,
          [id]: {
            ...newState[id],
            bounds: {
              ...newState[id].bounds,
              width: newState[id].bounds.width + payload.delta.width,
              height: newState[id].bounds.height + payload.delta.height,
            },
          },
        };
      }, state);
    }
  }
  return state;
};
