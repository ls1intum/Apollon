import { UMLElementType } from '../../packages/uml-element-type';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLContainer } from './uml-container';
import { AppendAction, ChangeOwnerAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types';

export class UMLContainerRepository {
  static isUMLContainer(element: IUMLElement): element is IUMLContainer & { type: UMLElementType } {
    return element.type in UMLElementType && 'ownedElements' in element;
  }

  static append = (id: string | string[], owner: string): AppendAction => ({
    type: UMLContainerActionTypes.APPEND,
    payload: { ids: Array.isArray(id) ? id : [id], owner },
  });

  static remove = (id: string | string[], owner: string): RemoveAction => ({
    type: UMLContainerActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id], owner },
  });

  // TODO: necessary?
  static changeOwner = (id: string | null, owner: string | null): ChangeOwnerAction => ({
    type: UMLContainerActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });
}
