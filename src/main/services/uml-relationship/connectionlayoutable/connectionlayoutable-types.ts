import { Action } from '../../../utils/actions/actions';
import { IPath } from '../../../utils/geometry/path';

export const enum ConnectionLayoutableActionTypes {
  START = '@@element/connectionlayoutable/START',
  CONNECTIONLAYOUT = '@@element/connectionlayoutable/CONNECTIONLAYOUT',
  END = '@@element/connectionlayoutable/END',
}

export type ConnectionLayoutableState = {};

export type ConnectionLayoutableActions =
  | ConnectionLayoutStartAction
  | ConnectionLayoutEndAction
  | ConnectionLayoutAction;

export type ConnectionLayoutStartAction = Action<ConnectionLayoutableActionTypes.START> & {
  payload: {
    ids: string[];
  };
};

export type ConnectionLayoutAction = Action<ConnectionLayoutableActionTypes.CONNECTIONLAYOUT> & {
  payload: {
    id: string;
    path: IPath;
  };
};

export type ConnectionLayoutEndAction = Action<ConnectionLayoutableActionTypes.END> & {
  payload: {
    ids: string[];
  };
};
