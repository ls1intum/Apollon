import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLDeploymentInterface } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-interface/uml-component-interface';
import { UMLInterfaceComponent } from '../../../../../main/packages/common/uml-interface/uml-interface-component';

it('render the uml-deployment-interface-component', () => {
  const component: UMLDeploymentInterface = new UMLDeploymentInterface({ name: 'TestDeploymentComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLInterfaceComponent element={component} />
    </svg>,
  );
  expect(getByText(component.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
