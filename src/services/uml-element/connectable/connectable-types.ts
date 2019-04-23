import { Action } from '../../../utils/actions/actions';

export const enum ConnectableActionTypes {
  CONNECT_START = '@@element/connectable/CONNECT_START',
  CONNECT_END = '@@element/connectable/CONNECT_END',
}

export type ConnectableState = string[];

export type ConnectableActions = ConnectStartAction | ConnectEndAction;

export interface ConnectStartAction extends Action<ConnectableActionTypes.CONNECT_START> {
  payload: {
    ids: string[];
  };
}

export interface ConnectEndAction extends Action<ConnectableActionTypes.CONNECT_END> {
  payload: {
    ids: string[];
  };
}