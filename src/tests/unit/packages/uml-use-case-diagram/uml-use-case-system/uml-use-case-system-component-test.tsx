import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLUseCaseSystem } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-system/uml-use-case-system';
import { UMLUseCaseSystemComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-system/uml-use-case-system-component';

it('render the uml-use-case-component', () => {
  const useCaseSystem: UMLUseCaseSystem = new UMLUseCaseSystem({ name: 'TestUseCaseComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLUseCaseSystemComponent element={useCaseSystem} />
    </svg>,
  );
  expect(getByText(useCaseSystem.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
