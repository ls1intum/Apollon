import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from "../../../../main/utils/geometry/point";
import { UMLInterfaceRequiredComponent } from "../../../../main/packages/common/uml-interface-required/uml-interface-required-component";
import { UMLComponentInterfaceRequired } from "../../../../main/packages/uml-component-diagram/uml-component-interface-required/uml-component-interface-required";

it('render the uml-component-required-interface-component', () => {
  const umlComponentInterfaceRequired: UMLComponentInterfaceRequired = new UMLComponentInterfaceRequired({ path: [new Point(0, 0), new Point(100, 100)] });
  // TODO: add store
  const { getByText } = render(
    <svg>
      <UMLInterfaceRequiredComponent element={umlComponentInterfaceRequired} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(umlDeploymentInterfaceRequired.name)).toBeInTheDocument();
});
