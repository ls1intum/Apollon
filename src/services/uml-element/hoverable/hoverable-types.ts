import { Action } from '../../../utils/actions/actions';

export const enum HoverableActionTypes {
  HOVER = '@@element/hoverable/HOVER',
  LEAVE = '@@element/hoverable/LEAVE',
}

export type HoverableState = string[];

export type HoverableActions = HoverAction | LeaveAction;

export interface HoverAction extends Action<HoverableActionTypes.HOVER> {
  payload: {
    ids: string[];
  };
}

export interface LeaveAction extends Action<HoverableActionTypes.LEAVE> {
  payload: {
    ids: string[];
  };
}
