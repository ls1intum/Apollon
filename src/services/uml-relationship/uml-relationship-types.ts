import { Action } from 'redux';
import { Port } from '../uml-element/port';
import { UMLRelationship } from './uml-relationship';

export const enum UMLRelationshipActionTypes {
  CREATE = '@@relationship/CREATE',
  REDRAW = '@@relationship/REDRAW',
  CONNECT = '@@relationship/CONNECT',
  FLIP = '@@relationship/FLIP',
}

export type UMLRelationshipActions = CreateAction | RedrawAction | ConnectAction | FlipAction;

export interface CreateAction extends Action<UMLRelationshipActionTypes.CREATE> {
  payload: {
    relationship: UMLRelationship;
  };
}

export interface RedrawAction extends Action<UMLRelationshipActionTypes.REDRAW> {
  payload: {
    id: string;
    path: Array<{ x: number; y: number }>;
    bounds: { x: number; y: number; width: number; height: number };
  };
}

export interface ConnectAction extends Action<UMLRelationshipActionTypes.CONNECT> {
  payload: {
    id: string;
    source?: Port;
    target?: Port;
  };
}

export interface FlipAction extends Action<UMLRelationshipActionTypes.FLIP> {
  payload: {
    id: string;
  };
}
