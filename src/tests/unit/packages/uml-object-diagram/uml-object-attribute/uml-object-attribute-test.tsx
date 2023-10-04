import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLClassifierMemberComponent } from '../../../../../main/packages/common/uml-classifier/uml-classifier-member-component';
import { UMLObjectAttribute } from '../../../../../main/packages/uml-object-diagram/uml-object-attribute/uml-object-attribute';

it('render the uml-object-attribute-component', () => {
  const attribute: UMLObjectAttribute = new UMLObjectAttribute({ name: 'TestObjectComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLClassifierMemberComponent element={attribute} />
    </svg>,
  );
  expect(getByText(attribute.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
