import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLDeploymentAssociation } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-association/uml-deployment-association';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLDeploymentAssociationComponent } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-association/uml-deployment-association-component';

it('render the uml-deplyoment-association-component', () => {
  const umlDeploymentAssociation: UMLDeploymentAssociation = new UMLDeploymentAssociation({
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLDeploymentAssociationComponent element={umlDeploymentAssociation} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(artifact.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
