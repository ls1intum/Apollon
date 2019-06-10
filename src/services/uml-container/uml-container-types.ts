import { Action } from '../../utils/actions/actions';

export const enum UMLContainerActionTypes {
  APPEND = '@@element/container/APPEND',
  REMOVE = '@@element/container/REMOVE',
}

export type UMLContainerActions = AppendAction | RemoveAction;

export type AppendAction = Action<UMLContainerActionTypes.APPEND> & {
  payload: {
    ids: string[];
    owner: string;
  };
};

export type RemoveAction = Action<UMLContainerActionTypes.REMOVE> & {
  payload: {
    ids: string[];
  };
};
