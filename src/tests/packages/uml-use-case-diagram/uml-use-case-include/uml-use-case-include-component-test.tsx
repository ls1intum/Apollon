import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLUseCaseIncludeComponent } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-include/uml-use-case-include-component';
import { UMLUseCaseInclude } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-include/uml-use-case-include';
import { Point } from '../../../../main/utils/geometry/point';

it('render the uml-use-case-include-component', () => {
  const umlUseCaseInclude: UMLUseCaseInclude = new UMLUseCaseInclude({
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <svg>
      <UMLUseCaseIncludeComponent element={umlUseCaseInclude} />
    </svg>,
  );
  expect(getByText('«include»')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
