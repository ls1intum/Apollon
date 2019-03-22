import { Action } from 'redux';
import { Assessment } from '../..';

export const enum ActionTypes {
  ASSESS = '@@element/ASSESS',
}

export type Actions = AssessAction;

export interface AssessAction extends Action<ActionTypes.ASSESS> {
  payload: {
    element: string;
    score: number;
    feedback?: string;
  };
}

export interface State {
  readonly [id: string]: Assessment;
}
