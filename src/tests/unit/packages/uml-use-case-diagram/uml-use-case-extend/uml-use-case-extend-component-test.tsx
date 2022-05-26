import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLUseCaseExtend } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend';
import { UMLUseCaseExtendComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend-component';

it('render the uml-use-case-extend-component', () => {
  const umlUseCaseExtend: UMLUseCaseExtend = new UMLUseCaseExtend({
    id: '225bb7a6-5af4-4473-ba96-7a30b02545c4',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLUseCaseExtendComponent element={umlUseCaseExtend} />
    </svg>,
  );
  expect(getByText('«extend»')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
