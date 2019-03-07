import { ActionTypes, AddChildAction } from './types';
import Container from './Container';
import Element from './../Element';

class Repository {
  static addChild = (parent: string, child: string): AddChildAction => ({
    type: ActionTypes.ADD_CHILD,
    payload: { parent, child },
  });

  // TODO: remove
  static addElement = (parent: Container, child: Element) => {};
  static removeElement = (parent: Container, child: Element) => {};
}

export default Repository;
