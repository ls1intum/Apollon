import { UMLElementType } from '../../packages/uml-element-type';
import { AsyncAction } from '../../utils/actions/actions';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLContainer } from './uml-container';
import { ChangeOwnerAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types';

export class UMLContainerRepository {
  static isUMLContainer(element: IUMLElement): element is IUMLContainer & { type: UMLElementType } {
    return element.type in UMLElementType && 'ownedElements' in element;
  }

  static append = (id: string | string[], owner?: string): AsyncAction => (dispatch, getState) =>
    dispatch({
      type: UMLContainerActionTypes.APPEND,
      payload: { ids: Array.isArray(id) ? id : [id], owner: owner || getState().diagram.id },
    });

  static remove = (id: string | string[]): RemoveAction => ({
    type: UMLContainerActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id] },
  });

  // TODO: necessary?
  static changeOwner = (id: string | null, owner: string | null): ChangeOwnerAction => ({
    type: UMLContainerActionTypes.CHANGE_OWNER,
    payload: { id, owner },
  });
}
