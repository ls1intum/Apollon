import { Reducer } from 'redux';
import { ElementState } from '../element/element-types';
import { IContainer } from './container';
import { ContainerActions, ContainerActionTypes } from './container-types';

const initialState: ElementState = {};

export const ContainerReducer: Reducer<ElementState, ContainerActions> = (state = initialState, action) => {
  switch (action.type) {
    case ContainerActionTypes.APPEND_CHILD: {
      const { payload } = action;
      const container = state[payload.owner] as IContainer;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: [...new Set([...container.ownedElements, payload.id].reverse())].reverse(),
        },
        [payload.id]: { ...state[payload.id], owner: payload.owner },
      };
    }
    case ContainerActionTypes.REMOVE_CHILD: {
      const { payload } = action;
      const container = state[payload.owner] as IContainer;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: container.ownedElements.filter(id => id !== payload.id),
        },
        ...(state[payload.id] && { [payload.id]: { ...state[payload.id], owner: null } }),
      };
    }
  }
  return state;
};
