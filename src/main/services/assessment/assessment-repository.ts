import { IAssessment } from './assessment';
import { AssessAction, AssessmentActionTypes, AssessmentState, DeleteAction } from './assessment-types';

export class AssessmentRepository {
  static assess = (element: string, assessment: IAssessment, assessmentType?: 'MANUAL' | 'DROPPED'): AssessAction => {
    const payloadAssessment = { ...assessment } as IAssessment;
    if (assessmentType !== 'DROPPED' && payloadAssessment.dropInfo) {
      delete payloadAssessment.dropInfo;
    }
    return {
      type: AssessmentActionTypes.ASSESS,
      payload: { element, assessment: payloadAssessment },
      undoable: false,
    };
  };

  static delete = (element: string): DeleteAction => {
    return {
      type: AssessmentActionTypes.DELETE,
      payload: { element },
      undoable: false,
    };
  };

  static getById =
    (assessments: AssessmentState) =>
    (id: string): IAssessment | null => {
      const assessment = assessments[id];
      if (!assessment) return null;
      return assessment;
    };
}
