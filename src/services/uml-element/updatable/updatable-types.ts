import { Action } from '../../../utils/actions/actions';

export const enum UpdatableActionTypes {
  UPDATE_START = '@@element/updatable/UPDATE_START',
  UPDATE_END = '@@element/updatable/UPDATE_END',
}

export type UpdatableState = string[];

export type UpdatableActions = UpdateStartAction | UpdateEndAction;

export type UpdateStartAction = Action<UpdatableActionTypes.UPDATE_START> & {
  payload: {
    ids: string[];
  };
};

export type UpdateEndAction = Action<UpdatableActionTypes.UPDATE_END> & {
  payload: {
    ids: string[];
  };
};
