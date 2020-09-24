import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from '../../../../main/utils/geometry/point';
import { UMLDeploymentInterfaceProvided } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-interface-provided/uml-deployment-interface-provided';
import { UMLInterfaceProvidedComponent } from '../../../../main/packages/common/uml-interface-provided/uml-interface-provided-component';

it('render the uml-deplyoment-interface-provided-component', () => {
  const umlDeploymentInterfaceProvided: UMLDeploymentInterfaceProvided = new UMLDeploymentInterfaceProvided({
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <svg>
      <UMLInterfaceProvidedComponent element={umlDeploymentInterfaceProvided} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(artifact.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
