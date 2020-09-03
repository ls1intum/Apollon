import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDeploymentDependency } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-dependency/uml-deployment-dependency';
import { UMLDependencyComponent } from '../../../../main/packages/common/uml-dependency/uml-dependency-component';
import { Point } from '../../../../main/utils/geometry/point';

it('render the uml-deplyoment-dependency-component', () => {
  const dependency: UMLDeploymentDependency = new UMLDeploymentDependency({
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText } = render(
    <svg>
      <UMLDependencyComponent element={dependency} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(dependency.name)).toBeInTheDocument();
});
