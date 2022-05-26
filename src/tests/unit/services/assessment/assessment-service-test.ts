import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../test-utils/test-utils';
import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { AssessmentRepository } from '../../../../main/services/assessment/assessment-repository';
import { IAssessment } from '../../../../main/services/assessment/assessment';
import { createUMLClassWithAttributeAndMethod } from '../../test-utils/test-data';

describe('test assessment redux state update', () => {
  let elements: UMLElement[] = [];
  let elementToAssess: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = createUMLClassWithAttributeAndMethod();
    elementToAssess = elements[0] as UMLClass;
  });

  it('assess element', () => {
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(Object.keys(store.getState().assessments)).toHaveLength(0);
    const assessment: IAssessment = { score: 1, feedback: 'Test Assessment' };
    store.dispatch(AssessmentRepository.assess(elementToAssess.id, assessment));

    expect(Object.keys(store.getState().assessments)).toHaveLength(1);
    expect(store.getState().assessments[elementToAssess.id]).toEqual(assessment);
  });

  it('get assessment by id', () => {
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    const assessment: IAssessment = { score: 1, feedback: 'Test Assessment' };
    store.dispatch(AssessmentRepository.assess(elementToAssess.id, assessment));
    const assessmentFromState = AssessmentRepository.getById(store.getState().assessments)(elementToAssess.id);
    expect(assessmentFromState).toEqual(assessment);
  });
});
