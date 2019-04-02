import { IAssessment } from './assessment';
import { AssessAction, AssessmentActionTypes, AssessmentState } from './assessment-types';

export class AssessmentRepository {
  static assess = (element: string, assessment: IAssessment): AssessAction => ({
    type: AssessmentActionTypes.ASSESS,
    payload: { element, assessment },
  });

  static getById = (assessments: AssessmentState) => (id: string): IAssessment | null => {
    const assessment = assessments[id];
    if (!assessment) return null;
    return assessment;
  };
}
