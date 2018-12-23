import { Action as ReduxAction } from 'redux';
import { State } from './../../components/Store';
import { ActionTypes, E, ElementState } from './types';
import Element from '.';
import * as Plugins from './../plugins';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
  element: Exclude<Element, 'render'>;
}

const action = (
  type: ActionTypes,
  element: Exclude<Element, 'render'>
): Action<ActionTypes> => ({
  type,
  element,
});

export type Actions =
  | Action<ActionTypes.CREATE>
  | Action<ActionTypes.UPDATE>
  | Action<ActionTypes.DELETE>;

class ElementRepository {
  static create = (element: Element) => action(ActionTypes.CREATE, element);

  static read = (state: State): Element[] => {
    const elements = Object.keys(state.elements).reduce<ElementState>(
      (r, e) => {
        if (state.elements[e].name !== 'Relationship')
          return { ...r, [e]: state.elements[e] };
        return r;
      },
      {}
    );

    type T = { [id: string]: Element };

    const extend = (elements: ElementState, current: ElementState = elements, owner: Element[] = []): T => {
      let result: T = {};
      for (const id in current) {
        const element = elements[id];
        const currentOwner = owner[owner.length - 1];
        if (element.owner === (currentOwner && currentOwner.id || null)) {
          if (element.ownedElements.length) {
            let update: Element = {
              ...element,
              ownedElements: [],
              owner: currentOwner || null,
            };
            const nextOwner: Element[] = [ ...owner, update ];
            const elementState: ElementState = element.ownedElements.reduce<ElementState>((o, k) => ({ ...o, [k]: elements[k]}), {});
            const res: T = extend(elements, elementState, nextOwner);
            update.ownedElements = Object.values(res);
            result = {
              ...result,
              [update.id]: update,
            }
          } else {
            const update: Element = {
              ...element,
              ownedElements: [],
              owner: currentOwner || null,
            };
            result = {
              ...result,
              [update.id]: update,
            }
          }
        }
      }

      return result;
    };

    const t = extend(elements);
    const p = Object.keys(t)
      .filter(k => t[k].owner === null)
      .reduce<T>((o, k) => ({ ...o, [k]: t[k] }), {});

    return Object.values(p).map((e: Element) => {
      const element = Object.setPrototypeOf(
        e,
        (<any>Plugins)[e.kind].prototype
      );
      element.render = new (<any>Plugins)[e.kind]().render;
      return element;
    });
  };

  static update = (element: Element) => action(ActionTypes.UPDATE, element);

  static delete = (element: Element) => action(ActionTypes.DELETE, element);
}

export default ElementRepository;
