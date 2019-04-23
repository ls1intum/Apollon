import { Action } from '../../../utils/actions/actions';
import { Port } from '../port';

export const enum ConnectableActionTypes {
  CONNECT_START = '@@element/connectable/CONNECT_START',
  CONNECT_END = '@@element/connectable/CONNECT_END',
}

export type ConnectableState = Port[];

export type ConnectableActions = ConnectStartAction | ConnectEndAction;

export interface ConnectStartAction extends Action<ConnectableActionTypes.CONNECT_START> {
  payload: {
    ports: Port[];
  };
}

export interface ConnectEndAction extends Action<ConnectableActionTypes.CONNECT_END> {
  payload: {
    ports: Port[];
  };
}
