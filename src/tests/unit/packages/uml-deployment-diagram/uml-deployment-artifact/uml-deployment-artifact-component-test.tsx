import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLDeploymentArtifact } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentArtifactComponent } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact-component';

it('render the uml-deplyoment-artifact-component', () => {
  const artifact: UMLDeploymentArtifact = new UMLDeploymentArtifact({ name: 'TestDeploymentComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLDeploymentArtifactComponent element={artifact} />
    </svg>,
  );
  expect(getByText(artifact.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
