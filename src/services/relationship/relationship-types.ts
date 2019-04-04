import { Action } from 'redux';
import { Port } from '../element/port';
import { Relationship } from './relationship';

export const enum RelationshipActionTypes {
  CREATE = '@@relationship/CREATE',
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
  FLIP = '@@relationship/FLIP',
}

export type RelationshipActions = CreateAction | RedrawAction | ConnectAction | FlipAction;

export interface CreateAction extends Action<RelationshipActionTypes.CREATE> {
  payload: {
    relationship: Relationship;
  };
}

export interface RedrawAction extends Action<RelationshipActionTypes.REDRAW> {
  payload: {
    id: string;
    path: Array<{ x: number; y: number }>;
    bounds: { x: number; y: number; width: number; height: number };
  };
}

export interface ConnectAction extends Action<RelationshipActionTypes.CONNECT> {
  payload: {
    id: string;
    source?: Port;
    target?: Port;
  };
}

export interface FlipAction extends Action<RelationshipActionTypes.FLIP> {
  payload: {
    id: string;
  };
}
