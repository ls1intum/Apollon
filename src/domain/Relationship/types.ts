import { Action as ReduxAction } from 'redux';
import Relationship from './Relationship';

export const enum ActionTypes {
  CREATE = '@@relationship/CREATE',
  RECALC = '@@relationship/RECALC',
}

export interface CreateAction extends ReduxAction<ActionTypes.CREATE> {
  payload: {
    relationship: Relationship;
  };
}

export interface RecalcAction extends ReduxAction<ActionTypes.RECALC> {
  payload: {
    id: string;
    path: { x: number; y: number }[];
  };
}

export type Actions = CreateAction | RecalcAction;
