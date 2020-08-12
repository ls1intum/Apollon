import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLUseCaseSystem } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-system/uml-use-case-system';
import { UMLUseCaseSystemComponent } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-system/uml-use-case-system-component';

it('render the uml-use-case-component', () => {
  const useCaseSystem: UMLUseCaseSystem = new UMLUseCaseSystem({ name: 'TestUseCaseComponent' });
  const { getByText } = render(
    <svg>
      <UMLUseCaseSystemComponent element={useCaseSystem} />
    </svg>,
  );
  expect(getByText(useCaseSystem.name)).toBeInTheDocument();
});
