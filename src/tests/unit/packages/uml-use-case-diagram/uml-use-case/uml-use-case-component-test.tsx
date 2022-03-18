import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLUseCase } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case/uml-use-case';
import { UMLUseCaseComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case/uml-use-case-component';

it('render the uml-use-case-component', () => {
  const component: UMLUseCase = new UMLUseCase({ name: 'TestUseCaseComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLUseCaseComponent element={component} />
    </svg>,
  );
  expect(getByText(component.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
