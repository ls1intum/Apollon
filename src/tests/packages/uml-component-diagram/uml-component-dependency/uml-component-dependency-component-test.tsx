import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDependencyComponent } from "../../../../main/packages/common/uml-dependency/uml-dependency-component";
import { Point } from "../../../../main/utils/geometry/point";
import { UMLComponentDependency } from "../../../../main/packages/uml-component-diagram/uml-component-dependency/uml-component-dependency";

it('render the uml-component-dependency-component', () => {
  const dependency: UMLComponentDependency = new UMLComponentDependency({ path: [new Point(0, 0), new Point(100, 100)] });
  const { getByText } = render(
    <svg>
      <UMLDependencyComponent element={dependency} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(dependency.name)).toBeInTheDocument();
});
