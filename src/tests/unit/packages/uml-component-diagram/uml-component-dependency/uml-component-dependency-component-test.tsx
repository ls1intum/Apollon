import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLDependencyComponent } from '../../../../../main/packages/common/uml-dependency/uml-dependency-component';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLComponentDependency } from '../../../../../main/packages/uml-component-diagram/uml-component-dependency/uml-component-dependency';

it('render the uml-component-dependency-component', () => {
  const dependency: UMLComponentDependency = new UMLComponentDependency({
    id: '77f00db7-ab65-41fb-9e87-aa123c7705c0',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLDependencyComponent element={dependency} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(dependency.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
