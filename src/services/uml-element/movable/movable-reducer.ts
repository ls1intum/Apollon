import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element-types';
import { MovableActions, MovableActionTypes } from './movable-types';

const initialState: UMLElementState = {};

export const MovableReducer: Reducer<UMLElementState, MovableActions> = (state = initialState, action) => {
  switch (action.type) {
    case MovableActionTypes.MOVE: {
      const { payload } = action;
      return payload.ids.reduce<UMLElementState>((newState, id) => {
        return {
          ...newState,
          [id]: {
            ...newState[id],
            bounds: {
              ...newState[id].bounds,
              x: newState[id].bounds.x + payload.delta.x,
              y: newState[id].bounds.y + payload.delta.y,
            },
          },
        };
      }, state);
    }
  }
  return state;
};
