import { Action } from 'redux';

export const enum UMLContainerActionTypes {
  CHANGE_OWNER = '@@container/CHANGE_OWNER',
  APPEND_CHILD = '@@container/APPEND_CHILD',
  REMOVE_CHILD = '@@container/REMOVE_CHILD',
}

export interface ChangeOwnerAction extends Action<UMLContainerActionTypes.CHANGE_OWNER> {
  payload: {
    id: string | null;
    owner: string | null;
  };
}

export interface AppendChildAction extends Action<UMLContainerActionTypes.APPEND_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export interface RemoveChildAction extends Action<UMLContainerActionTypes.REMOVE_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export type UMLContainerActions = ChangeOwnerAction | AppendChildAction | RemoveChildAction;
