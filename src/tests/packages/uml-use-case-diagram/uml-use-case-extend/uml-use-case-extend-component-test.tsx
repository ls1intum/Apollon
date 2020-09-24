import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from '../../../../main/utils/geometry/point';
import { UMLUseCaseExtend } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend';
import { UMLUseCaseExtendComponent } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend-component';

it('render the uml-use-case-extend-component', () => {
  const umlUseCaseExtend: UMLUseCaseExtend = new UMLUseCaseExtend({
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <svg>
      <UMLUseCaseExtendComponent element={umlUseCaseExtend} />
    </svg>,
  );
  expect(getByText('«extend»')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
