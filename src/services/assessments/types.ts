import { Action } from 'redux';
import { Assessment } from '../..';

export const enum ActionTypes {
  ASSESS = '@@element/ASSESS',
}

export type Actions = AssessAction;

export interface AssessAction extends Action<ActionTypes.ASSESS> {
  payload: {
    element: string;
    assessment: Assessment;
  };
}

export interface State {
  readonly [id: string]: Assessment;
}
