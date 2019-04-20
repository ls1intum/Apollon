import { ChangeOwnerAction, UMLContainerActionTypes } from './uml-container-types';

export class UMLContainerRepository {
  static changeOwner = (id: string | null, owner: string | null): ChangeOwnerAction => ({
    type: UMLContainerActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });
}
