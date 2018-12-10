import { Action as ReduxAction } from 'redux';
import { State } from './../../components/Store';
import { ActionTypes } from './types';
import Element from '.';
import * as Plugins from './../plugins';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
  element: Exclude<Element, 'render'>;
}

const action = (type: ActionTypes, element: Exclude<Element, 'render'>): Action<ActionTypes> => ({
  type,
  element,
});

export type Actions = Action<ActionTypes.CREATE> | Action<ActionTypes.UPDATE>;

class ElementRepository {
  static create = (element: Element) => action(ActionTypes.CREATE, element);

  static read = (state: State): any => {
    const elements = Object.values(state.elements).filter(
      e => e.futureKind !== 't'
    );
    return elements.map(e =>
      Object.setPrototypeOf(e, (<any>Plugins)[e.futureKind].prototype)
    );
  };

  static update = (element: Element) => action(ActionTypes.UPDATE, element);
}

export default ElementRepository;
