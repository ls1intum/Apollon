import { Action as ReduxAction } from 'redux';
import Relationship from './Relationship';

export const enum ActionTypes {
  CREATE = '@@relationship/CREATE',
  REDRAW = '@@relationship/REDRAW',
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
  };
}

export type Actions = CreateAction | RedrawAction;
