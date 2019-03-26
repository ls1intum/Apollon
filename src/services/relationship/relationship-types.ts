import { Action as ReduxAction } from 'redux';
import Port from '../../domain/Port';

export const enum RelationshipActionTypes {
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
}

export type RelationshipActions = RedrawAction | ConnectAction;

export interface RedrawAction extends ReduxAction<RelationshipActionTypes.REDRAW> {
  payload: {
    id: string;
    path: { x: number; y: number }[];
    bounds: { x: number; y: number; width: number; height: number };
  };
}

export interface ConnectAction extends ReduxAction<RelationshipActionTypes.CONNECT> {
  payload: {
    id: string;
    source?: Port;
    target?: Port;
  };
}
