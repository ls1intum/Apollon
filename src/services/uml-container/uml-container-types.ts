import { Action } from '../../utils/actions/actions';

export const enum UMLContainerActionTypes {
  APPEND = '@@element/container/APPEND',
  REMOVE = '@@element/container/REMOVE',
  CHANGE_OWNER = '@@container/CHANGE_OWNER',
}

export type UMLContainerActions = AppendAction | RemoveAction | ChangeOwnerAction;

export interface AppendAction extends Action<UMLContainerActionTypes.APPEND> {
  payload: {
    ids: string[];
    owner: string;
  };
}

export interface RemoveAction extends Action<UMLContainerActionTypes.REMOVE> {
  payload: {
    ids: string[];
  };
}

// TODO: necessary?
export interface ChangeOwnerAction extends Action<UMLContainerActionTypes.CHANGE_OWNER> {
  payload: {
    id: string | null;
    owner: string | null;
  };
}
