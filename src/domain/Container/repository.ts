import { ActionTypes, ChangeOwnerAction } from './types';

class Repository {
  static changeOwner = (
    id: string,
    owner: string | null
  ): ChangeOwnerAction => ({
    type: ActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });
}

export default Repository;
