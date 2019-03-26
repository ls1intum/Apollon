import { AssessmentActionTypes, AssessAction } from './assessment-types';
import { Assessment } from '../..';

export class AssessmentRepository {
  static assess = (element: string, assessment: Assessment): AssessAction => ({
    type: AssessmentActionTypes.ASSESS,
    payload: { element, assessment },
  });
}
