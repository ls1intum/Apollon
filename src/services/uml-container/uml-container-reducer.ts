import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLContainer } from './uml-container';
import { UMLContainerRepository } from './uml-container-repository';
import { UMLContainerActions, UMLContainerActionTypes } from './uml-container-types';

export const UMLContainerReducer: Reducer<UMLElementState, UMLContainerActions> = (state = {}, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action;
      const container = state[payload.owner];

      const t = {
        ...state,
        ...(container &&
          UMLContainerRepository.isUMLContainer(container) && {
            [container.id]: {
              ...container,
              ownedElements: [...new Set([...payload.ids, ...container.ownedElements])],
            },
          }),
      };

      return payload.ids.reduce<UMLElementState>((newState, id) => {
        const element = newState[id];
        if (!element) {
          return newState;
        }
        const owner = element.owner && newState[element.owner];

        return {
          ...newState,
          [id]: {
            ...newState[id],
            owner: container ? container.id : null,
            bounds: {
              ...newState[id].bounds,
              x: newState[id].bounds.x + (owner ? owner.bounds.x : 0) - (container ? container.bounds.x : 0),
              y: newState[id].bounds.y + (owner ? owner.bounds.y : 0) - (container ? container.bounds.y : 0),
            },
          },
          ...(owner &&
            UMLContainerRepository.isUMLContainer(owner) && {
              [owner.id]: {
                ...owner,
                ownedElements: owner.ownedElements.filter(ownedElement => !payload.ids.includes(ownedElement)),
              },
            }),
        };
      }, t);
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;
      const containers: IUMLContainer[] = [];

      const elementState = payload.ids.reduce<UMLElementState>((newState, id) => {
        const { owner } = state[id];
        console.log('id', id, 'owner', owner);
        if (!owner) {
          return newState;
        }
        const container = state[owner];
        if (!container || !UMLContainerRepository.isUMLContainer(container)) {
          return newState;
        }
        containers.push(container);
        return {
          ...newState,
          [id]: {
            ...newState[id],
            owner: null,
          },
        };
      }, state);

      return containers.reduce<UMLElementState>((newState, container) => {
        return {
          ...newState,
          [container.id]: {
            ...newState[container.id],
            ownedElements: container.ownedElements.filter(id => !payload.ids.includes(id)),
          },
        };
      }, elementState);

      // const container = state[payload.owner];
      // if (!container || !UMLContainerRepository.isUMLContainer(container)) {
      //   break;
      // }

      // return {
      //   ...state,
      //   [container.id]: {
      //     ...container,
      //     ownedElements: container.ownedElements.filter(id => !payload.ids.includes(id)),
      //   },
      //   ...payload.ids.reduce<UMLElementState>((_, id) => {
      //     return {
      //       [id]: {
      //         ...state[id],
      //         owner: null,
      //       },
      //     };
      //   }, {}),
      // };
    }
  }
  return state;
};
