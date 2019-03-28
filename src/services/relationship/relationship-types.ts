import { Action } from 'redux';
import { Port } from '../element/port';
import { Relationship } from './relationship';

export const enum RelationshipActionTypes {
  CREATE = '@@relationship/CREATE',
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
}

export type RelationshipActions = CreateAction | RedrawAction | ConnectAction;

export interface CreateAction extends Action<RelationshipActionTypes.CREATE> {
  payload: {
    relationship: Relationship;
  };
}

export interface RedrawAction extends Action<RelationshipActionTypes.REDRAW> {
  payload: {
    id: string;
    path: { x: number; y: number }[];
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
