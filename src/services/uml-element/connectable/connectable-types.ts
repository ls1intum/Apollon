import { Action } from '../../../utils/actions/actions';
import { IUMLElementPort } from '../uml-element-port';

export const enum ConnectableActionTypes {
  CONNECT_START = '@@element/connectable/CONNECT_START',
  CONNECT_END = '@@element/connectable/CONNECT_END',
}

export type ConnectableState = IUMLElementPort[];

export type ConnectableActions = ConnectStartAction | ConnectEndAction;

export type ConnectStartAction = Action<ConnectableActionTypes.CONNECT_START> & {
  payload: {
    ports: IUMLElementPort[];
  };
};

export type ConnectEndAction = Action<ConnectableActionTypes.CONNECT_END> & {
  payload: {
    ports: IUMLElementPort[];
  };
};
