import { Reducer } from 'redux';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { Actions } from '../actions';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLContainer, UMLContainer } from './uml-container';
import { UMLContainerActionTypes } from './uml-container-types';
import { UMLElements } from '../../packages/uml-elements';
import { UMLElementType } from '../..';

export const UMLContainerReducer: Reducer<UMLElementState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action;
      const container = state[payload.owner];
      const elementState = {
        ...state,
        ...(container &&
          UMLContainer.isUMLContainer(container) && {
            [container.id]: {
              ...container,
              ownedElements: [
                ...new Set(
                  // TODO: find better solution for this
                  // hacky: create new Element of Container type to reorder children. This must be done, because js prototype is lost in redux state
                  (new UMLElements[container.type as UMLElementType]() as UMLContainer).reorderChildren(
                    [...container.ownedElements, ...payload.ids].map((id) => state[id]),
                  ),
                ),
              ],
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

      return payload.ids.filter((id) => state[id]).reduce<UMLElementState>(reduce, elementState);
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;
      const ids = [
        ...new Set(
          payload.ids
            .filter((id) => state[id] && state[id].owner)
            .map((id) => state[id].owner)
            .filter(notEmpty),
        ),
      ];

      return ids.reduce<UMLElementState>(
        (elements, id) => ({
          ...elements,
          [id]: {
            ...state[id],
            ownedElements: (state[id] as IUMLContainer).ownedElements.filter(
              (element) => !payload.ids.includes(element),
            ),
          },
        }),
        state,
      );
    }
  }

  return state;
};
