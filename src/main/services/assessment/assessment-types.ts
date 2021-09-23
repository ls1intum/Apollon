import { Action } from '../../utils/actions/actions';
import { IAssessment } from './assessment';

export const enum AssessmentActionTypes {
  ASSESS = '@@element/ASSESS',
  DELETE = '@@assessment/DELETE',
}

export type AssessmentActions = AssessAction | DeleteAction;

export interface AssessAction extends Action<AssessmentActionTypes.ASSESS> {
  payload: {
    element: string;
    assessment: IAssessment;
  };
}

export interface DeleteAction extends Action<AssessmentActionTypes.DELETE> {
  payload: {
    element: string;
  };
}

export interface AssessmentState {
  readonly [id: string]: IAssessment;
}
