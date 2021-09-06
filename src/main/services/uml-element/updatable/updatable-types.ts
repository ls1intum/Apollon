import { Action } from '../../../utils/actions/actions';

export const enum UpdatableActionTypes {
  START = '@@element/updatable/START',
  END = '@@element/updatable/END',
  ENDALL = '@@element/updatable/ENDALL',
}

export type UpdatableState = string[];

export type UpdatableActions = UpdateStartAction | UpdateEndAction | UpdateEndAllAction;

export type UpdateStartAction = Action<UpdatableActionTypes.START> & {
  payload: {
    ids: string[];
  };
};

export type UpdateEndAction = Action<UpdatableActionTypes.END> & {
  payload: {
    ids: string[];
  };
};

export type UpdateEndAllAction = Action<UpdatableActionTypes.ENDALL> & {
  payload: {};
};
