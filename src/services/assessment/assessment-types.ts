import { Action } from 'redux';
import { IAssessment } from './assessment';

export const enum AssessmentActionTypes {
  ASSESS = '@@element/ASSESS',
}

export type AssessmentActions = AssessAction;

export interface AssessAction extends Action<AssessmentActionTypes.ASSESS> {
  payload: {
    element: string;
    assessment: IAssessment;
  };
}

export interface AssessmentState {
  readonly [id: string]: IAssessment;
}
