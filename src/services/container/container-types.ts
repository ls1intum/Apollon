import { Action } from 'redux';

export const enum ContainerActionTypes {
  CHANGE_OWNER = '@@container/CHANGE_OWNER',
  APPEND_CHILD = '@@container/APPEND_CHILD',
  REMOVE_CHILD = '@@container/REMOVE_CHILD',
}

export interface ChangeOwnerAction extends Action<ContainerActionTypes.CHANGE_OWNER> {
  payload: {
    id: string | null;
    owner: string | null;
  };
}

export interface AppendChildAction extends Action<ContainerActionTypes.APPEND_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export interface RemoveChildAction extends Action<ContainerActionTypes.REMOVE_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export type ContainerActions = ChangeOwnerAction | AppendChildAction | RemoveChildAction;
