import { ActionTypes, ChangeOwnerAction } from './types';

class Repository {
  static setOwner = (id: string, owner: string | null): ChangeOwnerAction => ({
    type: ActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });

  // static addChild = (parent: string, child: string): AddChildAction => ({
  //   type: ActionTypes.ADD_CHILD,
  //   payload: { parent, child },
  // });

  // TODO: remove
  // static addElement = (parent: Container, child: Element) => {};
  // static removeElement = (parent: Container, child: Element) => {};
}

export default Repository;
