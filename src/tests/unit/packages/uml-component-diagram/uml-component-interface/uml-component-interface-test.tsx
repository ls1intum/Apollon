import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLComponentInterface } from '../../../../../main/packages/uml-component-diagram/uml-component-interface/uml-component-interface';
import { UMLInterfaceComponent } from '../../../../../main/packages/common/uml-interface/uml-interface-component';

it('render the uml-component-component', () => {
  const umlInterface: UMLComponentInterface = new UMLComponentInterface({ name: 'TestComponentComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLInterfaceComponent element={umlInterface} />
    </svg>,
  );
  expect(getByText(umlInterface.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
