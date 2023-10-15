import { wrappedRender } from '../../../test-utils/render';
import { UMLClassifierMemberComponent } from '../../../../../main/packages/common/uml-classifier/uml-classifier-member-component';
import * as React from 'react';
import { UMLObjectMethod } from '../../../../../main/packages/uml-object-diagram/uml-object-method/uml-object-method';

it('render the uml-object-method-component', () => {
  const attribute: UMLObjectMethod = new UMLObjectMethod({ name: 'TestObjectComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLClassifierMemberComponent element={attribute} />
    </svg>,
  );
  expect(getByText(attribute.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
