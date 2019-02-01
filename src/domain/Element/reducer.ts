import Element from '.';
import { Reducer, AnyAction } from 'redux';
import { ElementState, ActionTypes } from './types';
import { Actions } from './repository';
import Container from '../Container';

const initialState: ElementState = {};

// const flatten = (e: Element): Element[] => {
//   return [e, ...e.ownedElements.reduce<Element[]>((r, k) => [...r, ...flatten(k)], [])];
// };

const ElementReducer: Reducer<ElementState, AnyAction> = (
  state: ElementState = initialState,
  action: AnyAction
): ElementState => {
  let elements: ElementState;
  switch (action.type) {
    case ActionTypes.CREATE:
      // elements = flatten(action.element).reduce<ElementState>((r, k) => ({ ...r, [k.id]: { ...k, owner: k.owner && k.owner.id, ownedElements: k.ownedElements.map(e => e.id), }}), {});

      return {
        ...state,
        // ...elements,
        [action.element.id]: { ...action.element },
      };
    case ActionTypes.UPDATE:
      // elements = flatten(action.element).reduce<ElementState>((r, k) => ({ ...r, [k.id]: { ...k, owner: k.owner && k.owner.id, ownedElements: k.ownedElements.map(e => e.id), }}), {});

      return {
        ...state,
        // ...elements,
        [action.element.id]: { ...action.element },
      };
    case ActionTypes.DELETE:
      const remove = (state: ElementState, ids: string[]): ElementState => {
        if (!ids.length) return state;
        const result: { [id: string]: Element } = {};
        let children: string[] = [];
        for (const id in state) {
          const e: Element = state[id];
          if (ids.includes(id)) {
            if ('ownedElements' in e) {
              const c = e as Container;
              children = children.concat(c.ownedElements);
            }
          } else {
            if ('ownedElements' in e) {
              const c = e as Container;
              c.ownedElements = c.ownedElements.filter(id => !ids.includes(id));
            }
            result[id] = state[id];
          }
        }
        return remove(result, children);
      };
      return remove(state, [action.element.id]);
  }
  return state;
};

export default ElementReducer;
