import { Reducer } from 'redux';
import { Point } from '../../utils/geometry/point';
import { UMLElementState } from '../uml-element/uml-element-types';
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

        let position = new Point();
        let current = owner;
        while (current) {
          position = position.add(current.bounds.x, current.bounds.y);
          current = current.owner ? newState[current.owner] : null;
        }

        current = container;
        while (current) {
          position = position.subtract(current.bounds.x, current.bounds.y);
          current = current.owner ? newState[current.owner] : null;
        }

        return {
          ...newState,
          [id]: {
            ...newState[id],
            owner: container ? container.id : null,
            bounds: {
              ...newState[id].bounds,
              x: newState[id].bounds.x + position.x,
              y: newState[id].bounds.y + position.y,
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

      return payload.ids.reduce<UMLElementState>((newState, id) => {
        const element = newState[id];
        if (!element) {
          return newState;
        }
        const owner = element.owner && newState[element.owner];

        if (!owner || !UMLContainerRepository.isUMLContainer(owner)) {
          return newState;
        }
        return {
          ...newState,
          [owner.id]: {
            ...newState[owner.id],
            ownedElements: owner.ownedElements.filter(e => !payload.ids.includes(e)),
          },
        };
      }, state);
    }
  }
  return state;
};
