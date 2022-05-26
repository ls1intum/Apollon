import * as React from 'react';
import { UMLObjectName } from '../../../../../main/packages/uml-object-diagram/uml-object-name/uml-object-name';
import { UMLObjectNameUpdate } from '../../../../../main/packages/uml-object-diagram/uml-object-name/uml-object-name-update';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';

it('render the uml-object-name-component', () => {
  const objectName: UMLObjectName = new UMLObjectName({ name: 'TestObjectComponent' });
  const store = getRealStore(undefined, [objectName]);
  const { getByDisplayValue, baseElement } = wrappedRender(<UMLObjectNameUpdate element={objectName} />, {
    store: store,
  });
  expect(getByDisplayValue(objectName.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
