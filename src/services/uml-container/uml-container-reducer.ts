import { Reducer } from 'redux';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLContainer } from './uml-container';
import { UMLContainerRepository } from './uml-container-repository';
import { UMLContainerActions, UMLContainerActionTypes } from './uml-container-types';

export const UMLContainerReducer: Reducer<UMLElementState, UMLContainerActions> = (state = {}, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action;
      const container = state[payload.owner];
      const elementState = {
        ...state,
        ...(container &&
          UMLContainerRepository.isUMLContainer(container) && {
            [container.id]: {
              ...container,
              ownedElements: [...new Set([...container.ownedElements, ...payload.ids])],
            },
          }),
      };

      const reduce = (elements: UMLElementState, id: string): UMLElementState => {
        const element = elements[id];
        let position = new Point(element.bounds.x, element.bounds.y);
        let current = element.owner && elements[element.owner];
        while (current) {
          position = position.add(current.bounds.x, current.bounds.y);
          current = current.owner ? elements[current.owner] : null;
        }

        current = container;
        while (current) {
          position = position.subtract(current.bounds.x, current.bounds.y);
          current = current.owner ? elements[current.owner] : null;
        }

        return {
          ...elements,
          [id]: {
            ...elements[id],
            owner: container ? container.id : null,
            bounds: {
              ...element.bounds,
              ...position,
            },
          },
        };
      };

      return payload.ids.filter(id => state[id]).reduce<UMLElementState>(reduce, elementState);
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;
      const ids = [
        ...new Set(
          payload.ids
            .filter(id => state[id] && state[id].owner)
            .map(id => state[id].owner)
            .filter(notEmpty),
        ),
      ];

      return ids.reduce<UMLElementState>(
        (elements, id) => ({
          ...elements,
          [id]: {
            ...state[id],
            ownedElements: (state[id] as IUMLContainer).ownedElements.filter(element => !payload.ids.includes(element)),
          },
        }),
        state,
      );
    }
  }

  return state;
};
