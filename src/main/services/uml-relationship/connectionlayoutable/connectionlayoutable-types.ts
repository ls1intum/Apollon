import { Action } from '../../../utils/actions/actions';
import { IPath } from '../../../utils/geometry/path';

export const enum ConnectionLayoutableActionTypes {
  START = '@@element/connectionlayoutable/START',
  END = '@@element/connectionlayoutable/END',
}

export type ConnectionLayoutableState = {};

export type ConnectionLayoutableActions = ConnectionLayoutStartAction | ConnectionLayoutEndAction;

export type ConnectionLayoutStartAction = Action<ConnectionLayoutableActionTypes.START> & {
  payload: {
    id: string;
    path: IPath;
  };
};

export type ConnectionLayoutEndAction = Action<ConnectionLayoutableActionTypes.END> & {
  payload: {
    id: string;
  };
};
