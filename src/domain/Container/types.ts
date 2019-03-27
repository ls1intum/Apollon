import { Action } from 'redux';

export const enum ActionTypes {
  CHANGE_OWNER = '@@container/CHANGE_OWNER',
  APPEND_CHILD = '@@container/APPEND_CHILD',
  REMOVE_CHILD = '@@container/REMOVE_CHILD',
}

export interface ChangeOwnerAction extends Action<ActionTypes.CHANGE_OWNER> {
  payload: {
    id: string | null;
    owner: string | null;
  };
}

export interface AppendChildAction extends Action<ActionTypes.APPEND_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export interface RemoveChildAction extends Action<ActionTypes.REMOVE_CHILD> {
  payload: {
    id: string;
    owner: string;
  };
}

export type Actions = ChangeOwnerAction | AppendChildAction | RemoveChildAction;
