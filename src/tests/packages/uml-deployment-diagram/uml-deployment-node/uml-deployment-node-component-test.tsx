import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDeploymentNode } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-node/uml-deployment-node';
import { UMLDeploymentNodeComponent } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-node/uml-deployment-node-component';

it('render the uml-deployment-node-component', () => {
  const deploymentNode: UMLDeploymentNode = new UMLDeploymentNode({ name: 'TestDeploymentComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLDeploymentNodeComponent element={deploymentNode} scale={1.0} />
    </svg>,
  );
  expect(getByText(deploymentNode.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
