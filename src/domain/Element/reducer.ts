import Element from '.';
import { Reducer } from 'redux';
import { ElementState, ActionTypes } from './types';
import { Actions } from './repository';

const initialState: ElementState = {};

const flatten = (e: Element): Element[] => {
  return [e, ...e.ownedElements.reduce<Element[]>((r, k) => [...r, ...flatten(k)], [])];
};

const ElementReducer: Reducer<ElementState, Actions> = (
  state: ElementState = initialState,
  action: Actions
): ElementState => {
  let elements: ElementState;
  switch (action.type) {
    case ActionTypes.CREATE:
      elements = flatten(action.element).reduce<ElementState>((r, k) => ({ ...r, [k.id]: { ...k, owner: k.owner && k.owner.id, ownedElements: k.ownedElements.map(e => e.id), }}), {});

      return {
        ...state,
        ...elements,
        // [action.element.id]: { ...action.element },
      };
    case ActionTypes.UPDATE:
      elements = flatten(action.element).reduce<ElementState>((r, k) => ({ ...r, [k.id]: { ...k, owner: k.owner && k.owner.id, ownedElements: k.ownedElements.map(e => e.id), }}), {});
    
      return {
        ...state,
        ...elements,
        // [action.element.id]: { ...action.element },
      };
    case ActionTypes.DELETE:
      const find = (id: string): string[] => {
        const t = state[id].ownedElements.reduce<string[]>((o, e) => [...o, ...find(e)], []);
        return [id, ...t];
      }
      const toDelete: string[] = find(action.element.id);
      return Object.keys(state)
        .filter(key => !toDelete.includes(key))
        .reduce<ElementState>((acc, key) => ({ ...acc, [key]: {
          ...state[key],
          ownedElements: state[key].ownedElements.filter(e => !toDelete.includes(e)),
        }}), {});
  }
  return state;
};

export default ElementReducer;
