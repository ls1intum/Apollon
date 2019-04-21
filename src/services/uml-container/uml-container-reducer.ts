import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element/uml-element-types';
import { UMLContainerRepository } from './uml-container-repository';
import { UMLContainerActions, UMLContainerActionTypes } from './uml-container-types';

export const UMLContainerReducer: Reducer<UMLElementState, UMLContainerActions> = (state = {}, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!container || !UMLContainerRepository.isUMLContainer(container)) {
        break;
      }

      return {
        ...state,
        [container.id]: {
          ...container,
          ownedElements: [...new Set([...payload.ids, ...container.ownedElements])],
        },
        ...payload.ids.reduce<UMLElementState>((_, id) => {
          return {
            [id]: {
              ...state[id],
              owner: payload.owner,
            },
          };
        }, {}),
      };
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!UMLContainerRepository.isUMLContainer(container)) {
        break;
      }

      return {
        ...state,
        [container.id]: {
          ...container,
          ownedElements: container.ownedElements.filter(id => !payload.ids.includes(id)),
        },
        ...payload.ids.reduce<UMLElementState>((_, id) => {
          return {
            [id]: {
              ...state[id],
              owner: null,
            },
          };
        }, {}),
      };
    }
  }
  return state;
};
