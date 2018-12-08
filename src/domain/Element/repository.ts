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

export type Actions = Action<ActionTypes.SELECT> | Action<ActionTypes.DESELECT>;

class ElementRepository {
  static select = (element: Element) => action(ActionTypes.SELECT, element);
  static deselect = (element: Element) => action(ActionTypes.DESELECT, element);
}

export default ElementRepository;
