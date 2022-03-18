import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDeploymentArtifact } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentArtifactComponent } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact-component';

it('render the uml-deplyoment-artifact-component', () => {
  const artifact: UMLDeploymentArtifact = new UMLDeploymentArtifact({ name: 'TestDeploymentComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLDeploymentArtifactComponent element={artifact} scale={1.0} />
    </svg>,
  );
  expect(getByText(artifact.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
