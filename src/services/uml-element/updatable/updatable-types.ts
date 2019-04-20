import { Action } from '../../../utils/actions/actions';

export const enum UpdatableActionTypes {
  UPDATE_START = '@@element/editable/UPDATE_START',
  UPDATE_END = '@@element/editable/UPDATE_END',
}

export type UpdatableActions = UpdateStartAction | UpdateEndAction;

export interface UpdateStartAction extends Action<UpdatableActionTypes.UPDATE_START> {
  payload: {
    ids: string[];
  };
}

export interface UpdateEndAction extends Action<UpdatableActionTypes.UPDATE_END> {
  payload: {
    ids: string[];
  };
}

export interface UpdatableState extends Array<string> {}
