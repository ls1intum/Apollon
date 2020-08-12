import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDeploymentInterface } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-interface/uml-component-interface';
import { UMLInterfaceComponent } from '../../../../main/packages/common/uml-interface/uml-interface-component';

it('render the uml-deployment-interface-component', () => {
  const component: UMLDeploymentInterface = new UMLDeploymentInterface({ name: 'TestDeploymentComponent' });
  const { getByText } = render(
    <svg>
      <UMLInterfaceComponent element={component} />
    </svg>,
  );
  expect(getByText(component.name)).toBeInTheDocument();
});
