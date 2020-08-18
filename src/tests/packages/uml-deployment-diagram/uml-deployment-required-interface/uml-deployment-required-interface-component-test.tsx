import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from "../../../../main/utils/geometry/point";
import { UMLDeploymentInterfaceRequired } from "../../../../main/packages/uml-deployment-diagram/uml-deployment-interface-required/uml-deployment-interface-required";
import { UMLInterfaceRequiredComponent } from "../../../../main/packages/common/uml-interface-required/uml-interface-required-component";

it('render the uml-deplyoment-required-interface-component', () => {
  const umlDeploymentInterfaceRequired: UMLDeploymentInterfaceRequired = new UMLDeploymentInterfaceRequired({ path: [new Point(0, 0), new Point(100, 100)] });
  // TODO: add store
  const { getByText } = render(
    <svg>
      <UMLInterfaceRequiredComponent element={umlDeploymentInterfaceRequired} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(umlDeploymentInterfaceRequired.name)).toBeInTheDocument();
});
