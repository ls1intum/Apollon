import { Action as ReduxAction } from 'redux';
import Port from '../Port';

export const enum ActionTypes {
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
}

export interface RedrawAction extends ReduxAction<ActionTypes.REDRAW> {
  payload: {
    id: string;
    path: { x: number; y: number }[];
    bounds: { x: number; y: number; width: number; height: number };
  };
}

export interface ConnectAction extends ReduxAction<ActionTypes.CONNECT> {
  payload: {
    id: string;
    source?: Port;
    target?: Port;
  };
}

export type Actions = RedrawAction | ConnectAction;
