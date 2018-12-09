import { Action as ReduxAction } from 'redux';
import { State } from './../../components/Store';
import { ActionTypes } from './types';
import Element from '.';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
  element: Element;
}

const action = (type: ActionTypes, element: Element): Action<ActionTypes> => ({
  type,
  element,
});

export type Actions = Action<ActionTypes.CREATE> | Action<ActionTypes.UPDATE>;

class ElementRepository {
  static create = (element: Element) => action(ActionTypes.CREATE, element);
  static update = (element: Element) => action(ActionTypes.UPDATE, element);
}

export default ElementRepository;
