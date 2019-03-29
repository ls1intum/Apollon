import { ChangeOwnerAction, ContainerActionTypes } from './container-types';

export class ContainerRepository {
  static changeOwner = (id: string | null, owner: string | null): ChangeOwnerAction => ({
    type: ContainerActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });
}
