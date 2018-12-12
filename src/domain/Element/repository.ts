import { Action as ReduxAction } from 'redux';
import { State } from './../../components/Store';
import { ActionTypes } from './types';
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
    const elements = Object.values(state.elements).filter(
      e => e.name !== 'Relationship'
    );
    return elements.map(e => {
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
