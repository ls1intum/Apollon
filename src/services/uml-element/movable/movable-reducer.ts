import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { UMLElementActionTypes } from '../uml-element-types';
import { MovableActionTypes, MovableState } from './movable-types';
import { IUMLElement } from '../uml-element';

export const MovableReducer: Reducer<MovableState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case MovableActionTypes.START: {
      const { payload } = action;

      return payload.elements.reduce(
        (elements: MovableState, element: IUMLElement) => ({
          ...elements,
          [element.id]: {
            ...element,
          },
        }),
        state,
      );
    }
    case MovableActionTypes.MOVE: {
      const { payload } = action;

      return payload.ids.reduce(
        (elements: MovableState, id: string) => ({
          ...elements,
          ...(id in elements && {
            [id]: {
              ...elements[id],
              bounds: {
                ...elements[id].bounds,
                x: elements[id].bounds.x + payload.delta.x,
                y: elements[id].bounds.y + payload.delta.y,
              },
            },
          }),
        }),
        state,
      );
    }
    case UMLElementActionTypes.DELETE:
    case MovableActionTypes.END: {
      const { payload } = action;

      return Object.keys(state)
        .filter((id) => !payload.ids.includes(id))
        .reduce((newState, key) => {
          return { ...newState, [key]: state[key] };
        }, {});
    }
  }

  return state;
};
