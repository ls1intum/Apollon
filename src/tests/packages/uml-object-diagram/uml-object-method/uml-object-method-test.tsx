import { render } from '@testing-library/react';
import { UMLClassifierMemberComponent } from '../../../../main/packages/common/uml-classifier/uml-classifier-member-component';
import * as React from 'react';
import { UMLObjectMethod } from '../../../../main/packages/uml-object-diagram/uml-object-method/uml-object-method';

it('render the uml-object-method-component', () => {
  const attribute: UMLObjectMethod = new UMLObjectMethod({ name: 'TestObjectComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLClassifierMemberComponent element={attribute} scale={1.0} />
    </svg>,
  );
  expect(getByText(attribute.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
