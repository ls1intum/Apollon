import { Action } from '../../../utils/actions/actions';

export const enum UpdatableActionTypes {
  START = '@@element/updatable/START',
  END = '@@element/updatable/END',
}

export type UpdatableState = string[];

export type UpdatableActions = UpdateStartAction | UpdateEndAction;

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
