import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLContainer } from './uml-container';
import { UMLContainerActions, UMLContainerActionTypes } from './uml-container-types';

const initialState: UMLElementState = {};

export const UMLContainerReducer: Reducer<UMLElementState, UMLContainerActions> = (state = initialState, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND_CHILD: {
      const { payload } = action;
      const container = state[payload.owner] as IUMLContainer;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: [...new Set([...container.ownedElements, payload.id].reverse())].reverse(),
        },
        [payload.id]: { ...state[payload.id], owner: payload.owner },
      };
    }
    case UMLContainerActionTypes.REMOVE_CHILD: {
      const { payload } = action;
      const container = state[payload.owner] as IUMLContainer;
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
