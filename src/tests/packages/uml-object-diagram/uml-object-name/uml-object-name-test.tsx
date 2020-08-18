import { render } from '@testing-library/react';
import * as React from 'react';
import { UMLObjectName } from '../../../../main/packages/uml-object-diagram/uml-object-name/uml-object-name';
import { UMLClassifierComponent } from '../../../../main/packages/common/uml-classifier/uml-classifier-component';

it('render the uml-object-name-component', () => {
  const objectName: UMLObjectName = new UMLObjectName({ name: 'TestObjectComponent' });
  const { getByText } = render(
    <svg>
      <UMLClassifierComponent element={objectName} />
    </svg>,
  );
  expect(getByText(objectName.name)).toBeInTheDocument();
});
