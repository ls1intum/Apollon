import { Action } from '../../../utils/actions/actions';
import { IUMLElementPort } from '../uml-element-port';

export const enum ConnectableActionTypes {
  START = '@@element/connectable/START',
  END = '@@element/connectable/END',
}

export type ConnectableState = IUMLElementPort[];

export type ConnectableActions = ConnectStartAction | ConnectEndAction;

export type ConnectStartAction = Action<ConnectableActionTypes.START> & {
  payload: {
    ports: IUMLElementPort[];
  };
};

export type ConnectEndAction = Action<ConnectableActionTypes.END> & {
  payload: {
    ports: IUMLElementPort[];
  };
};
