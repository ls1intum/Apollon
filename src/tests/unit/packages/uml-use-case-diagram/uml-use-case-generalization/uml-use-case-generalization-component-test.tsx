import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLUseCaseGeneralizationComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-generalization/uml-use-case-generalization-component';
import { UMLUseCaseGeneralization } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-generalization/uml-use-case-generalization';

it('render the uml-use-case-generalization-component', () => {
  const umlUseCaseGeneralization: UMLUseCaseGeneralization = new UMLUseCaseGeneralization({
    id: '516e57ef-ae31-4311-8d9d-2aeb6c97f924',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLUseCaseGeneralizationComponent element={umlUseCaseGeneralization} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText('«extend»')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
