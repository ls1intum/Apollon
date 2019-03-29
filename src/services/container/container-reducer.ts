import { Reducer } from 'redux';
import { ElementRepository } from '../element/element-repository';
import { ElementState } from '../element/element-types';
import { Container } from './container';
import { ContainerActions, ContainerActionTypes } from './container-types';

const initialState: ElementState = {};

export const ContainerReducer: Reducer<ElementState, ContainerActions> = (state = initialState, action) => {
  switch (action.type) {
    case ContainerActionTypes.APPEND_CHILD: {
      const { payload } = action;
      const container = ElementRepository.getById(state)(payload.owner);
      if (!(container instanceof Container)) return state;
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
      const container = ElementRepository.getById(state)(payload.owner);
      if (!(container instanceof Container)) return state;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: container.ownedElements.filter(id => id !== payload.id),
        },
        [payload.id]: { ...state[payload.id], owner: null },
      };
    }
  }
  return state;
};
