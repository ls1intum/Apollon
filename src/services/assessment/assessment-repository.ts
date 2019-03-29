import { Assessment } from '../../typings';
import { AssessAction, AssessmentActionTypes } from './assessment-types';

export class AssessmentRepository {
  static assess = (element: string, assessment: Assessment): AssessAction => ({
    type: AssessmentActionTypes.ASSESS,
    payload: { element, assessment },
  });
}
