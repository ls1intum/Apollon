import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLComponentComponent as UMLComponent } from '../../../../main/packages/uml-component-diagram/uml-component/uml-component-component';
import { UMLComponentComponent } from '../../../../main/packages/common/uml-component/uml-component-component';

it('render the uml-component-component', () => {
  const component: UMLComponent = new UMLComponent({ name: 'TestComponentComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLComponentComponent element={component} />
    </svg>,
  );
  expect(getByText(component.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
