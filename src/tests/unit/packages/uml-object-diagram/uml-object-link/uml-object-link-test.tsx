import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLObjectLink } from '../../../../../main/packages/uml-object-diagram/uml-object-link/uml-object-link';
import { UMLObjectLinkComponent } from '../../../../../main/packages/uml-object-diagram/uml-object-link/uml-object-link-component';

it('render the uml-object-link-component', () => {
  const umlObjectLink: UMLObjectLink = new UMLObjectLink({ path: [new Point(0, 0), new Point(100, 100)] });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLObjectLinkComponent element={umlObjectLink} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText(umlObjectLink.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
