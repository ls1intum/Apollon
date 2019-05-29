import { Action } from '../../utils/actions/actions';

export const enum UMLContainerActionTypes {
  APPEND = '@@element/container/APPEND',
  REMOVE = '@@element/container/REMOVE',
}

export type UMLContainerActions = AppendAction | RemoveAction;

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
