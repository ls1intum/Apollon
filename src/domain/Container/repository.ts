import { Action as ReduxAction } from 'redux';
import { ActionTypes } from './types';
import Container from './Container';
import Element from './../Element';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
  parent: Container;
  child: Element;
}

const action = (
  type: ActionTypes,
  parent: Container,
  child: Element
): Action<ActionTypes> => ({
  type,
  parent,
  child,
});

export type Actions = Action<ActionTypes.ADD_ELEMENT>;

class ContainerRepository {
  static addElement = (parent: Container, child: Element) =>
    action(ActionTypes.ADD_ELEMENT, parent, child);
}

export default ContainerRepository;
