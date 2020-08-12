import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLComponentComponent } from "../../../../main/packages/uml-component-diagram/uml-component/uml-component-component";
import { UMLComponent } from "../../../../main/packages/uml-component-diagram/uml-component/uml-component";

it('render the uml-component-component', () => {
  const component: UMLComponent = new UMLComponent({ name: 'TestComponentComponent' });
  const { getByText } = render(
    <svg>
      <UMLComponentComponent element={component} />
  </svg>,
);
  expect(getByText(component.name)).toBeInTheDocument();
});
