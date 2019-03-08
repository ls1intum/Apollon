import { Action as ReduxAction } from 'redux';
import Relationship from './Relationship';
import Port from '../Port';

export const enum ActionTypes {
  CREATE = '@@relationship/CREATE',
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
}

export interface CreateAction extends ReduxAction<ActionTypes.CREATE> {
  payload: {
    relationship: Relationship;
  };
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

export type Actions = CreateAction | RedrawAction | ConnectAction;
