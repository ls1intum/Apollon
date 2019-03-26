import { Action } from 'redux';
import { Assessment } from '../..';

export const enum AssessmentActionTypes {
  ASSESS = '@@element/ASSESS',
}

export type AssessmentActions = AssessAction;

export interface AssessAction extends Action<AssessmentActionTypes.ASSESS> {
  payload: {
    element: string;
    assessment: Assessment;
  };
}

export interface AssessmentState {
  readonly [id: string]: Assessment;
}
