import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLComponentInterface } from '../../../../main/packages/uml-component-diagram/uml-component-interface/uml-component-interface';
import { UMLInterfaceComponent } from '../../../../main/packages/common/uml-interface/uml-interface-component';

it('render the uml-component-component', () => {
  const umlInterface: UMLComponentInterface = new UMLComponentInterface({ name: 'TestComponentComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLInterfaceComponent element={umlInterface} scale={1.0} />
    </svg>,
  );
  expect(getByText(umlInterface.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
